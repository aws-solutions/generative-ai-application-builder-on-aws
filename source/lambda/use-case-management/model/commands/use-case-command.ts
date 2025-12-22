// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { StackNotFoundException } from '@aws-sdk/client-cloudformation';
import { ResourceNotFoundException } from '@aws-sdk/client-dynamodb';
import { StackManagement, UseCaseStackDetails } from '../../cfn/stack-management';
import { StorageManagement } from '../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../ddb/use-case-config-management';
import { ListUseCasesAdapter, UseCaseRecord } from '../list-use-cases';
import { UseCase } from '../use-case';

import { logger, tracer } from '../../power-tools-init';
import { DEFAULT_USE_CASES_PER_PAGE, Status } from '../../utils/constants';
import { GetUseCaseAdapter, validateAdminToken, castToAdminType, castToBusinessUserType } from '../get-use-case';
import { UseCaseConfiguration, GetUseCaseDetailsAdminResponse, GetUseCaseDetailsUserResponse } from '../types';
import { CaseCommand } from './case-command';
import { UseCaseValidator, ValidatorFactory } from '../validators';
import { extractTenantId, isPlatformAdmin, isCustomerPrincipal } from '../../utils/utils';

export type DeploymentDetails = {
    useCaseRecord: UseCaseRecord;
    useCaseDeploymentDetails: UseCaseStackDetails;
    useCaseConfigDetails: UseCaseConfiguration;
};

/**
 * Command interface to define operations on use cases that the deployment stack manages
 */
export abstract class UseCaseMgmtCommand implements CaseCommand {
    stackMgmt: StackManagement;
    storageMgmt: StorageManagement;
    useCaseConfigMgmt: UseCaseConfigManagement;
    validator: UseCaseValidator;

    constructor() {
        this.stackMgmt = new StackManagement();
        this.storageMgmt = new StorageManagement();
        this.useCaseConfigMgmt = new UseCaseConfigManagement();
    }

    /**
     * Initializes the validator based on the use case type.
     * This method should be called before using validateNewUseCase or validateUpdateUseCase.
     *
     * @param useCaseType - The type of use case (e.g., 'Text', 'Agent')
     */
    protected initializeValidator(useCaseType: string): void {
        this.validator = ValidatorFactory.createValidator(useCaseType, this.storageMgmt, this.useCaseConfigMgmt);
    }

    /**
     * Validates a new use case using the initialized validator.
     *
     * @param useCase - The use case to be validated
     * @returns A promise that resolves to the validated use case
     * @throws Error if the validator has not been initialized
     */
    protected async validateNewUseCase(useCase: UseCase): Promise<UseCase> {
        if (!this.validator) {
            throw new Error('Validator not initialized. Call initializeValidator first.');
        }
        return this.validator.validateNewUseCase(useCase);
    }

    /**
     * Validates an updated use case using the initialized validator.
     *
     * @param useCase - The use case to be validated
     * @param oldDynamoDbRecordKey - The key of the old DynamoDB record
     * @returns A promise that resolves to the validated use case
     * @throws Error if the validator has not been initialized
     */
    protected async validateUpdateUseCase(useCase: UseCase, oldDynamoDbRecordKey: string): Promise<UseCase> {
        if (!this.validator) {
            throw new Error('Validator not initialized. Call initializeValidator first.');
        }
        return this.validator.validateUpdateUseCase(useCase, oldDynamoDbRecordKey);
    }

    /**
     * The method all command extensions must implement
     * @param useCase
     */
    abstract execute(useCase: UseCase): Promise<any>;
}

/**
 * Command to create a new use case
 */
export class CreateUseCaseCommand extends UseCaseMgmtCommand {
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###createUseCaseCommand' })
    public async execute(useCase: UseCase): Promise<Status> {
        let stackId: string;
        this.initializeValidator(useCase.useCaseType);

        try {
            await this.useCaseConfigMgmt.createUseCaseConfig(useCase);
        } catch (error) {
            logger.error(`Error while creating the DDB record containing the use case config, Error: ${error}`);
            throw error;
        }

        try {
            useCase = await this.validateNewUseCase(useCase);
            stackId = await this.stackMgmt.createStack(useCase);
            useCase.stackId = stackId;
        } catch (error) {
            // If the creation fails don't add to DLQ. hence do not throw the error
            logger.warn('Stack creation failed, hence aborting further steps');
            return Status.FAILED;
        }
        try {
            await this.storageMgmt.createUseCaseRecord(useCase);
        } catch (error) {
            logger.error(`Error while inserting use case record in DDB, Error: ${error}`);
            throw error;
        }

        return Status.SUCCESS;
    }
}

/**
 * Command to update a use case
 */
export class UpdateUseCaseCommand extends UseCaseMgmtCommand {
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateUseCaseCommand' })
    public async execute(useCase: UseCase): Promise<any> {
        let oldDynamoDbRecordKey;
        this.initializeValidator(useCase.useCaseType);
        try {
            const useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);
            oldDynamoDbRecordKey = useCaseRecord.UseCaseConfigRecordKey;
            useCase.stackId = useCaseRecord.StackId;

            useCase = await this.validateUpdateUseCase(useCase, oldDynamoDbRecordKey);

            const roleArn = await this.stackMgmt.getStackRoleArnIfExists(useCaseRecord);
            await this.stackMgmt.updateStack(useCase, roleArn);
        } catch (error) {
            // If the update fails don't throw the error, otherwise it adds to the DLQ
            return Status.FAILED;
        }
        try {
            await this.storageMgmt.updateUseCaseRecord(useCase);
        } catch (error) {
            logger.error(`Error while updating use case record in DDB, Error: ${error}`);
            throw error;
        }
        try {
            await this.useCaseConfigMgmt.updateUseCaseConfig(useCase, oldDynamoDbRecordKey);
        } catch (error) {
            logger.error(`Error while updating the DynamoDB key containing the use case config, Error: ${error}`);
            throw error;
        }
        return Status.SUCCESS;
    }
}

/**
 * Command to delete a use case. A deleted use case simply means the underlying stack is deleted,
 * however the data in the DB as well as settings in use case config DB is still retained.
 * PermanentlyDeleteUseCaseCommand implements full 'true' deletion.
 */
export class DeleteUseCaseCommand implements CaseCommand {
    stackMgmt: StackManagement;
    storageMgmt: StorageManagement;
    useCaseConfigMgmt: UseCaseConfigManagement;

    // prettier-ignore
    constructor() { // NOSONAR - typescript:S4144 - this hierarchy is separate from line 49.
        this.stackMgmt = new StackManagement();
        this.storageMgmt = new StorageManagement();
        this.useCaseConfigMgmt = new UseCaseConfigManagement();
    }

    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteUseCaseCommand' })
    public async execute(useCase: UseCase): Promise<any> {
        try {
            // we need to retrieve the stackId from DDB in order to perform the deletion
            const useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);
            // this record key mapping is required to mark the LLM config of the use case.
            useCase.setUseCaseConfigRecordKey(useCaseRecord.UseCaseConfigRecordKey);
            useCase.stackId = useCaseRecord.StackId;

            const roleArn = await this.stackMgmt.getStackRoleArnIfExists(useCaseRecord);
            await this.stackMgmt.deleteStack(useCase, roleArn);
        } catch (error) {
            // If the deletion fails don't add to DLQ. hence do not throw the error
            return Status.FAILED;
        }
        try {
            await this.storageMgmt.markUseCaseRecordForDeletion(useCase);
            await this.useCaseConfigMgmt.markUseCaseRecordForDeletion(useCase);
        } catch (error) {
            logger.error(`Error while setting TTL for use case record in DDB, Error: ${error}`);
            throw error;
        }

        return Status.SUCCESS;
    }
}

/**
 * Command to permanently delete a use case, which results in removal of the use case from the use cases table
 */
export class PermanentlyDeleteUseCaseCommand implements CaseCommand {
    stackMgmt: StackManagement;
    storageMgmt: StorageManagement;
    useCaseConfigMgmt: UseCaseConfigManagement;

    // prettier-ignore
    constructor() { // NOSONAR - typescript:S4144 - this hierarchy is separate from line 49.
        this.stackMgmt = new StackManagement();
        this.storageMgmt = new StorageManagement();
        this.useCaseConfigMgmt = new UseCaseConfigManagement();
    }

    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###permanentlyDeleteUseCaseCommand' })
    public async execute(useCase: UseCase): Promise<any> {
        // with a permanent delete, its possible we have already deleted the stack and param, so handling is needed
        let useCaseRecord;
        try {
            useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);
            // this record key mapping is required for deleting LLM config for the use case.
            useCase.setUseCaseConfigRecordKey(useCaseRecord.UseCaseConfigRecordKey);
            useCase.stackId = useCaseRecord.StackId;
        } catch (error) {
            logger.error(`Error while retrieving use case record from DDB, Error: ${error}`);
            throw error;
        }

        try {
            const roleArn = await this.stackMgmt.getStackRoleArnIfExists(useCaseRecord);
            await this.stackMgmt.deleteStack(useCase, roleArn);
        } catch (error) {
            // If the stack is already deleted, we can proceed
            if (error instanceof StackNotFoundException) {
                logger.warn('Stack does not exist, hence skipping deletion.');
            } else {
                // If the deletion fails don't add to DLQ. hence do not throw the error
                return Status.FAILED;
            }
        }

        await this.markConfigForDeletion(useCase);
        await this.deleteDdbRecord(useCase);

        return Status.SUCCESS;
    }

    private async deleteDdbRecord(useCase: UseCase) {
        try {
            await this.storageMgmt.deleteUseCaseRecord(useCase);
        } catch (error) {
            logger.error(`Error while deleting use case record in DDB, Error: ${error}`);
            throw error;
        }
    }

    private async markConfigForDeletion(useCase: UseCase) {
        try {
            await this.useCaseConfigMgmt.markUseCaseConfigForDeletion(useCase);
        } catch (error) {
            if (error instanceof ResourceNotFoundException) {
                logger.warn('Config record does not exist, hence skipping TTL setting.');
            } else {
                logger.error(`Error while marking use case configuration for deletion, Error: ${error}`);
                throw error;
            }
        }
    }
}

/**
 * Command to list all use cases
 */
export class ListUseCasesCommand implements CaseCommand {
    stackMgmt: StackManagement;
    storageMgmt: StorageManagement;
    useCaseConfigMgmt: UseCaseConfigManagement;

    // prettier-ignore
    constructor() { // NOSONAR - typescript:S4144 - this hierarchy is separate from line 152.
        this.stackMgmt = new StackManagement();
        this.storageMgmt = new StorageManagement();
        this.useCaseConfigMgmt = new UseCaseConfigManagement();
    }

    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###listUseCasesCommand' })
    public async execute(listUseCasesEvent: ListUseCasesAdapter): Promise<any> {
        logger.debug('Enter ListUseCasesCommand');

        const useCaseDeploymentsMap = new Map<string, DeploymentDetails>();

        let useCaseRecords: UseCaseRecord[];
        let numUseCases: number;

        try {
            const response = await this.storageMgmt.getAllCaseRecords(listUseCasesEvent);
            useCaseRecords = response.useCaseRecords;

            useCaseRecords = this.filterUseCasesByType(useCaseRecords);

            // Platform SaaS: tenant scoping
            // - platform admins see everything
            // - customer users/admins only see deployments assigned to their tenant
            const event = listUseCasesEvent.event;
            if (!isPlatformAdmin(event) && isCustomerPrincipal(event)) {
                const tenantId = extractTenantId(event);
                if (tenantId) {
                    useCaseRecords = useCaseRecords.filter((r) => r.TenantId === tenantId);
                } else {
                    // Customer without a tenant id should see nothing
                    useCaseRecords = [];
                }
            } else if (isPlatformAdmin(event) && listUseCasesEvent.tenantId) {
                // Admin can optionally filter the global list by tenant
                useCaseRecords = useCaseRecords.filter((r) => r.TenantId === listUseCasesEvent.tenantId);
            }

            if (listUseCasesEvent.searchFilter) {
                useCaseRecords = this.filterUseCases(useCaseRecords, listUseCasesEvent.searchFilter);
            }

            useCaseRecords = this.sortUseCasesByCreationDate(useCaseRecords);

            numUseCases = useCaseRecords.length;
            const startIndex = (listUseCasesEvent.pageNumber - 1) * DEFAULT_USE_CASES_PER_PAGE;
            const endIndex = startIndex + DEFAULT_USE_CASES_PER_PAGE;

            useCaseRecords = useCaseRecords.slice(startIndex, endIndex); // Get subset of use cases based on page number
        } catch (error) {
            logger.error(`Error while listing the use case records in DDB, Error: ${error}`);
            throw error;
        }

        try {
            // Best-effort backfill of VoicePhoneNumber for older records (derive from VoiceRoutingTable)
            const voiceMap = await this.storageMgmt.getVoicePhoneNumberMap(useCaseRecords.map((r) => r.UseCaseId));
            useCaseRecords = useCaseRecords.map((r) => ({
                ...r,
                VoicePhoneNumber: r.VoicePhoneNumber ?? voiceMap.get(r.UseCaseId) ?? ''
            }));

            for (const element of useCaseRecords) {
                const useCaseRecord = element;
                const stackDetails = await this.stackMgmt.getStackDetailsFromUseCaseRecord(useCaseRecord);

                if (!useCaseRecord.UseCaseConfigRecordKey) {
                    logger.error('UseCaseConfigRecordKey missing in the use case record');
                } else {
                    let useCaseConfigDetails;

                    try {
                        useCaseConfigDetails = await this.useCaseConfigMgmt.getUseCaseConfigFromRecord(useCaseRecord);
                    } catch (error) {
                        logger.error(`Error while retrieving the use case config from Ddb table, Error: ${error}`);
                    }

                    if (useCaseConfigDetails) {
                        useCaseDeploymentsMap.set(useCaseRecord.StackId, {
                            useCaseRecord,
                            useCaseDeploymentDetails: stackDetails,
                            useCaseConfigDetails: useCaseConfigDetails
                        });
                    }
                }
            }
            return this.formatUseCasesToList(
                useCaseDeploymentsMap,
                numUseCases,
                this.findNextPage(numUseCases, listUseCasesEvent.pageNumber)
            );
        } catch (error) {
            logger.error(`Error while listing the stack details, Error: ${error}`);
            throw error;
        }
    }

    /**
     * Filters use cases based on presence of the search filter in the UseCaseId and Name fields if present (case insensitive)
     *
     * @param useCaseRecords - Retrieved use case records from DDB to be filtered and selected from.
     * @param searchFilter - Search filter provided by the user. Will search against UseCaseId and Name fields
     * @returns - Filtered list of use cases to return to the user, and total number of
     */
    private filterUseCases(useCaseRecords: UseCaseRecord[], searchFilter: string) {
        // Filter use cases based on search filter
        const searchFilterLower = searchFilter.toLowerCase();
        useCaseRecords = useCaseRecords.filter(
            (useCaseRecord) =>
                useCaseRecord.UseCaseId.toLowerCase().includes(searchFilterLower) ||
                useCaseRecord.Name.toLowerCase().includes(searchFilterLower)
        );

        return useCaseRecords;
    }

    /**
     * Computes the next page number if there are more use cases beyond the current page.
     *
     * @param totalUseCases
     * @param currentPage
     * @param useCasesPerPage
     * @returns the next page or undefined if there are no more use cases beyond the current page.
     */
    private findNextPage(
        totalUseCases: number,
        currentPage: number,
        useCasesPerPage: number = DEFAULT_USE_CASES_PER_PAGE
    ) {
        if (currentPage * useCasesPerPage < totalUseCases) {
            return currentPage + 1;
        }
        return undefined;
    }

    /**
     * sorts the use case records by creation date. This can be done lexicographically since dates are in ISO 8601 format,
     * with the latest being shown first.
     */
    private sortUseCasesByCreationDate(useCaseRecords: UseCaseRecord[]) {
        useCaseRecords.sort((a, b) => b.CreatedDate.localeCompare(a.CreatedDate));
        return useCaseRecords;
    }

    /**
     * Filters use case records by type, removing any records that don't have a valid use case type.
     *
     * @param useCaseRecords - Array of use case records to filter
     * @returns Filtered array of use case records with valid types
     */
    protected filterUseCasesByType(useCaseRecords: UseCaseRecord[]): UseCaseRecord[] {
        //no filtering performed within this top-level function
        return useCaseRecords;
    }

    /**
     * Formatting the data from ddb, use case config config, and a stack's deployment details to a list of use cases
     * to send to the front end.
     *
     * @param useCaseDeploymentsMap
     * @returns
     */
    protected formatUseCasesToList = (
        useCaseDeploymentsMap: Map<string, DeploymentDetails>,
        numUseCases: number,
        nextPage: number | undefined
    ): any => {
        // note: future server side sorting may go here
        const formattedData: any = [];
        try {
            useCaseDeploymentsMap.forEach((value, key) => {
                formattedData.push({
                    Name: value.useCaseRecord.Name,
                    UseCaseId: value.useCaseRecord.UseCaseId,
                        TenantId: value.useCaseRecord.TenantId ?? '',
                    VoicePhoneNumber: value.useCaseRecord.VoicePhoneNumber ?? '',
                    CreatedDate: value.useCaseRecord.CreatedDate,
                    Description: value.useCaseRecord.Description,
                    useCaseUUID: value.useCaseDeploymentDetails.useCaseUUID,
                    status: value.useCaseDeploymentDetails.status,
                    cloudFrontWebUrl: value.useCaseDeploymentDetails.cloudFrontWebUrl ?? undefined,
                    ModelProvider: value.useCaseConfigDetails.LlmParams?.ModelProvider,
                    UseCaseType: value.useCaseConfigDetails.UseCaseType ?? undefined
                });
            });

            const response = {
                deployments: formattedData,
                numUseCases: numUseCases,
                nextPage: nextPage
            };

            logger.debug(`Formatted use cases list: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            logger.error('Deployments data formatting error. Likely use case config JSON parsing error');
            throw error;
        }
    };
}

/**
 * Command to get a use case
 */
export class GetUseCaseCommand implements CaseCommand {
    stackMgmt: StackManagement;
    storageMgmt: StorageManagement;
    useCaseConfigMgmt: UseCaseConfigManagement;

    // prettier-ignore
    constructor() { // NOSONAR - typescript:S4144 - this hierarchy is separate from line 152.
        this.stackMgmt = new StackManagement();
        this.storageMgmt = new StorageManagement();
        this.useCaseConfigMgmt = new UseCaseConfigManagement();
    }

    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###getUseCaseCommand' })
    public async execute(
        GetUseCaseAdapterEvent: GetUseCaseAdapter
    ): Promise<GetUseCaseDetailsAdminResponse | GetUseCaseDetailsUserResponse> {
        try {
            const useCase = new UseCase(GetUseCaseAdapterEvent.useCaseId, '', '', undefined, {}, '', '', '');
            const useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);

            // Platform SaaS: enforce tenant isolation on GET details
            // - platform admins can view any use case
            // - customer principals can only view use cases assigned to their tenant
            const event = GetUseCaseAdapterEvent.event;
            if (!isPlatformAdmin(event) && isCustomerPrincipal(event)) {
                const tid = extractTenantId(event);
                if (!tid || useCaseRecord.TenantId !== tid) {
                    // Return 404-like behavior to avoid leaking existence of other tenants' resources
                    throw new Error('Not found');
                }
            }

            // Best-effort backfill of VoicePhoneNumber for older records (derive from VoiceRoutingTable)
            if (!useCaseRecord.VoicePhoneNumber) {
                const voiceMap = await this.storageMgmt.getVoicePhoneNumberMap([useCaseRecord.UseCaseId]);
                useCaseRecord.VoicePhoneNumber = voiceMap.get(useCaseRecord.UseCaseId) ?? '';
            }

            const stackDetails = await this.stackMgmt.getStackDetailsFromUseCaseRecord(useCaseRecord);
            const useCaseConfig = await this.useCaseConfigMgmt.getUseCaseConfigFromRecord(useCaseRecord);
            // NOTE: Keep VoicePhoneNumber from the use case record authoritative.
            // We've seen cases where consumers rely on VoicePhoneNumber being present when VoiceRoutingTable has the mapping,
            // but the merged object can accidentally drop optional fields depending on how config objects are shaped.
            const combined: any = { ...useCaseRecord, ...stackDetails, ...useCaseConfig };
            combined.VoicePhoneNumber = useCaseRecord.VoicePhoneNumber;
            combined.TenantId = useCaseRecord.TenantId;

            const isAdmin = await validateAdminToken(GetUseCaseAdapterEvent.authToken);
            let useCaseInfo: GetUseCaseDetailsAdminResponse | GetUseCaseDetailsUserResponse;

            if (isAdmin) {
                useCaseInfo = castToAdminType(combined);
            } else {
                // Customer portal uses customer_* groups; return a customer-safe detail payload.
                useCaseInfo = castToBusinessUserType(combined);
            }

            return useCaseInfo;
        } catch (error) {
            logger.error(`Error while getting Use Case Details, Error: ${error}`);
            throw error;
        }
    }
}
