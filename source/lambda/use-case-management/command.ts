/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import { StackNotFoundException } from '@aws-sdk/client-cloudformation';
import { ResourceNotFoundException } from '@aws-sdk/client-secrets-manager';
import { ParameterNotFound } from '@aws-sdk/client-ssm';
import { parse, validate } from '@aws-sdk/util-arn-parser';
import { StackManagement, UseCaseStackDetails } from './cfn/stack-management';
import { StorageManagement } from './ddb/storage-management';
import { ListUseCasesAdapter, StackInfo, UseCaseRecord } from './model/list-use-cases';
import { UseCase } from './model/use-case';
import { logger, tracer } from './power-tools-init';
import { SecretManagement } from './secretsmanager/secret-management';
import { ConfigManagement } from './ssm/config-management';

export enum Status {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED'
}

export type DeploymentDetails = {
    useCaseRecord: UseCaseRecord;
    useCaseDeploymentDetails: UseCaseStackDetails;
    useCaseConfigDetails: string;
};

export interface CaseCommand {
    execute(useCase: UseCase | ListUseCasesAdapter): Promise<any>;
}

/**
 * Command interface to define operations on use cases that the deployment stack manages
 */
export abstract class UseCaseMgmtCommand implements CaseCommand {
    stackMgmt: StackManagement;
    storageMgmt: StorageManagement;
    configMgmt: ConfigManagement;
    secretMgmt: SecretManagement;

    constructor() {
        this.stackMgmt = new StackManagement();
        this.storageMgmt = new StorageManagement();
        this.configMgmt = new ConfigManagement();
        this.secretMgmt = new SecretManagement();
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
        try {
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

        try {
            await this.configMgmt.createUseCaseConfig(useCase);
        } catch (error) {
            logger.error(`Error while creating the SSM parameter containing the use case config, Error: ${error}`);
            throw error;
        }

        if (useCase.requiresAPIKey()) {
            try {
                await this.secretMgmt.createSecret(useCase);
            } catch (error) {
                logger.error(`Error while creating the secret in secrets manager, Error: ${error}`);
                throw error;
            }
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
        let oldSSMParamName;
        try {
            const useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);
            oldSSMParamName = useCaseRecord.SSMParameterKey;
            useCase.stackId = useCaseRecord.StackId;
            await this.stackMgmt.updateStack(useCase);
        } catch (error) {
            // If the update fails don't add to DLQ. hence do not throw the error
            return Status.FAILED;
        }
        try {
            await this.storageMgmt.updateUseCaseRecord(useCase);
        } catch (error) {
            logger.error(`Error while updating use case record in DDB, Error: ${error}`);
            throw error;
        }
        try {
            await this.configMgmt.updateUseCaseConfig(useCase, oldSSMParamName);
        } catch (error) {
            logger.error(`Error while updating the SSM parameter containing the use case config, Error: ${error}`);
            throw error;
        }
        if (useCase.requiresAPIKey()) {
            try {
                await this.secretMgmt.updateSecret(useCase);
            } catch (error) {
                logger.error(`Error while updating the secret in secrets manager, Error: ${error}`);
                throw error;
            }
        }

        return Status.SUCCESS;
    }
}

/**
 * Command to delete a use case. A deleted use case simply means the underlying stack is deleted,
 * however the data in the DB as well as settings in SSM are still retained.
 * PermanentlyDeleteUseCaseCommand implements full 'true' deletion.
 */
export class DeleteUseCaseCommand implements CaseCommand {
    stackMgmt: StackManagement;
    configMgmt: ConfigManagement;
    storageMgmt: StorageManagement;
    secretMgmt: SecretManagement;

    constructor() {
        // NOSONAR - typescript:S4144 - this hierarchy is separate from line 152.
        this.stackMgmt = new StackManagement();
        this.configMgmt = new ConfigManagement();
        this.storageMgmt = new StorageManagement();
        this.secretMgmt = new SecretManagement();
    }

    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteUseCaseCommand' })
    public async execute(useCase: UseCase): Promise<any> {
        try {
            // we need to retrieve the stackId from DDB in order to perform the deletion
            const useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);
            useCase.stackId = useCaseRecord.StackId;
            await this.stackMgmt.deleteStack(useCase);
        } catch (error) {
            // If the deletion fails don't add to DLQ. hence do not throw the error
            return Status.FAILED;
        }
        try {
            await this.storageMgmt.markUseCaseRecordForDeletion(useCase);
        } catch (error) {
            logger.error(`Error while setting TTL for use case record in DDB, Error: ${error}`);
            throw error;
        }
        if (useCase.requiresAPIKey()) {
            try {
                await this.secretMgmt.deleteSecret(useCase);
            } catch (error) {
                logger.error(`Error while creating the secret in secrets manager, Error: ${error}`);
                throw error;
            }
        }
        return Status.SUCCESS;
    }
}

/**
 * Command to permanently delete a use case, which results in removal of the use case from the use cases table
 */
export class PermanentlyDeleteUseCaseCommand implements CaseCommand {
    stackMgmt: StackManagement;
    configMgmt: ConfigManagement;
    storageMgmt: StorageManagement;
    secretMgmt: SecretManagement;

    // prettier-ignore
    constructor() { // NOSONAR - typescript:S4144 - this hierarchy is separate from line 152.
        this.stackMgmt = new StackManagement();
        this.configMgmt = new ConfigManagement();
        this.storageMgmt = new StorageManagement();
        this.secretMgmt = new SecretManagement();
    }

    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###permanentlyDeleteUseCaseCommand' })
    public async execute(useCase: UseCase): Promise<any> {
        // with a permanent delete, its possible we have already deleted the stack and param, so handling is needed
        let useCaseRecord;
        try {
            useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);
            useCase.stackId = useCaseRecord.StackId;
        } catch (error) {
            logger.error(`Error while retrieving use case record from DDB, Error: ${error}`);
            throw error;
        }

        try {
            await this.stackMgmt.deleteStack(useCase);
        } catch (error) {
            // If the stack is already deleted, we can proceed
            if (error instanceof StackNotFoundException) {
                logger.warn('Stack does not exist, hence skipping deletion.');
            } else {
                // If the deletion fails don't add to DLQ. hence do not throw the error
                return Status.FAILED;
            }
        }

        useCase.setSSMParameterKey(useCaseRecord.SSMParameterKey);
        await this.deleteDdbRecord(useCase);
        await this.deleteConfig(useCase);

        if (useCase.requiresAPIKey()) {
            await this.deleteSecret(useCase);
        }

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

    private async deleteSecret(useCase: UseCase) {
        try {
            await this.secretMgmt.deleteSecret(useCase);
        } catch (error) {
            if (error instanceof ResourceNotFoundException) {
                logger.warn('Secret does not exist, hence skipping deletion.');
            } else {
                logger.error(`Error while deleting the secret for the use case, Error: ${error}`);
                throw error;
            }
        }
    }

    private async deleteConfig(useCase: UseCase) {
        try {
            await this.configMgmt.deleteUseCaseConfig(useCase);
        } catch (error) {
            if (error instanceof ParameterNotFound) {
                logger.warn('Parameter does not exist, hence skipping deletion.');
            } else {
                logger.error(`Error while deleting the SSM parameter containing the use case config, Error: ${error}`);
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
    configMgmt: ConfigManagement;

    constructor() {
        this.stackMgmt = new StackManagement();
        this.storageMgmt = new StorageManagement();
        this.configMgmt = new ConfigManagement();
    }

    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###listUseCasesCommand' })
    public async execute(listUseCasesEvent: ListUseCasesAdapter): Promise<any> {
        logger.debug('Enter ListUseCasesCommand');

        const useCaseDeploymentsMap = new Map<string, DeploymentDetails>();

        let useCaseRecords: UseCaseRecord[];
        let scannedCount: number | undefined;

        try {
            const response = await this.storageMgmt.getAllCaseRecords(listUseCasesEvent);
            useCaseRecords = response.useCaseRecords;
            scannedCount = response.scannedCount;
        } catch (error) {
            logger.error(`Error while listing the use case records in DDB, Error: ${error}`);
            throw error;
        }

        try {
            for (const element of useCaseRecords) {
                const useCaseRecord = element;
                const stackDetails = await this.stackMgmt.getStackDetails(
                    this.createStackInfoFromDdbRecord(useCaseRecord)
                );

                if (!stackDetails.chatConfigSSMParameterName) {
                    logger.error('ChatConfigSSMParameterName missing in the stack details');
                } else {
                    let useCaseConfigDetails;

                    try {
                        useCaseConfigDetails = await this.configMgmt.getUseCaseConfigFromName(
                            stackDetails.chatConfigSSMParameterName
                        );
                    } catch (error) {
                        logger.error(`Error while retrieving the use case config from SSM, Error: ${error}`);
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
            return this.formatUseCasesToList(useCaseDeploymentsMap, scannedCount);
        } catch (error) {
            logger.error(`Error while listing the stack details, Error: ${error}`);
            throw error;
        }
    }

    /**
     * Formatting the data from ddb, ssm config, and a stack's deployment details to a list of use cases
     * to send to the front end.
     *
     * @param useCaseDeploymentsMap
     * @returns
     */
    private formatUseCasesToList = (
        useCaseDeploymentsMap: Map<string, DeploymentDetails>,
        scannedCount: number | undefined
    ): any => {
        // note: future server side sorting may go here
        const formattedData: any = [];
        try {
            useCaseDeploymentsMap.forEach((value, key) => {
                formattedData.push({
                    ...value.useCaseRecord,
                    ...value.useCaseDeploymentDetails,
                    ...JSON.parse(value.useCaseConfigDetails)
                });
            });

            const response = {
                deployments: formattedData,
                scannedCount: scannedCount
            };

            logger.debug(`Formatted use cases list: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            logger.error('Deployments data formatting error. Likely use case config JSON parsing error');
            throw error;
        }
    };

    /**
     *
     * @param useCaseRecord Use case record object created from DDB record
     * @returns
     */
    private createStackInfoFromDdbRecord = (useCaseRecord: UseCaseRecord): StackInfo => {
        console.debug(`useCaseRecord: ${JSON.stringify(useCaseRecord)}`);
        if (!validate(useCaseRecord.StackId)) {
            throw new Error(`Invalid stackId ARN provided in DDB record: ${useCaseRecord.StackId}`);
        }
        const parsedArn = parse(useCaseRecord.StackId);

        // parsedArn.resource has the form `stack/stack-name/unique-id`
        // `stack/` has to be removed from the resource to get the valid stack name

        return {
            stackArn: useCaseRecord.StackId,
            stackId: parsedArn.resource.replace('stack/', ''),
            stackInstanceAccount: parsedArn.accountId,
            stackInstanceRegion: parsedArn.region
        } as StackInfo;
    };
}
