"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListUseCasesCommand = exports.PermanentlyDeleteUseCaseCommand = exports.DeleteUseCaseCommand = exports.UpdateUseCaseCommand = exports.CreateUseCaseCommand = exports.UseCaseMgmtCommand = exports.Status = void 0;
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const client_ssm_1 = require("@aws-sdk/client-ssm");
const util_arn_parser_1 = require("@aws-sdk/util-arn-parser");
const stack_management_1 = require("./cfn/stack-management");
const storage_management_1 = require("./ddb/storage-management");
const power_tools_init_1 = require("./power-tools-init");
const secret_management_1 = require("./secretsmanager/secret-management");
const config_management_1 = require("./ssm/config-management");
var Status;
(function (Status) {
    Status["SUCCESS"] = "SUCCESS";
    Status["FAILED"] = "FAILED";
})(Status || (exports.Status = Status = {}));
/**
 * Command interface to define operations on use cases that the deployment stack manages
 */
class UseCaseMgmtCommand {
    constructor() {
        this.stackMgmt = new stack_management_1.StackManagement();
        this.storageMgmt = new storage_management_1.StorageManagement();
        this.configMgmt = new config_management_1.ConfigManagement();
        this.secretMgmt = new secret_management_1.SecretManagement();
    }
}
exports.UseCaseMgmtCommand = UseCaseMgmtCommand;
/**
 * Command to create a new use case
 */
class CreateUseCaseCommand extends UseCaseMgmtCommand {
    async execute(useCase) {
        let stackId;
        try {
            stackId = await this.stackMgmt.createStack(useCase);
            useCase.stackId = stackId;
        }
        catch (error) {
            // If the creation fails don't add to DLQ. hence do not throw the error
            power_tools_init_1.logger.warn('Stack creation failed, hence aborting further steps');
            return Status.FAILED;
        }
        try {
            await this.storageMgmt.createUseCaseRecord(useCase);
        }
        catch (error) {
            power_tools_init_1.logger.error(`Error while inserting use case record in DDB, Error: ${error}`);
            throw error;
        }
        try {
            await this.configMgmt.createUseCaseConfig(useCase);
        }
        catch (error) {
            power_tools_init_1.logger.error(`Error while creating the SSM parameter containing the use case config, Error: ${error}`);
            throw error;
        }
        if (useCase.requiresAPIKey()) {
            try {
                await this.secretMgmt.createSecret(useCase);
            }
            catch (error) {
                power_tools_init_1.logger.error(`Error while creating the secret in secrets manager, Error: ${error}`);
                throw error;
            }
        }
        return Status.SUCCESS;
    }
}
exports.CreateUseCaseCommand = CreateUseCaseCommand;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###createUseCaseCommand' })
], CreateUseCaseCommand.prototype, "execute", null);
/**
 * Command to update a use case
 */
class UpdateUseCaseCommand extends UseCaseMgmtCommand {
    async execute(useCase) {
        let oldSSMParamName;
        try {
            const useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);
            oldSSMParamName = useCaseRecord.SSMParameterKey;
            useCase.stackId = useCaseRecord.StackId;
            await this.stackMgmt.updateStack(useCase);
        }
        catch (error) {
            // If the update fails don't add to DLQ. hence do not throw the error
            return Status.FAILED;
        }
        try {
            await this.storageMgmt.updateUseCaseRecord(useCase);
        }
        catch (error) {
            power_tools_init_1.logger.error(`Error while updating use case record in DDB, Error: ${error}`);
            throw error;
        }
        try {
            await this.configMgmt.updateUseCaseConfig(useCase, oldSSMParamName);
        }
        catch (error) {
            power_tools_init_1.logger.error(`Error while updating the SSM parameter containing the use case config, Error: ${error}`);
            throw error;
        }
        if (useCase.requiresAPIKey()) {
            try {
                await this.secretMgmt.updateSecret(useCase);
            }
            catch (error) {
                power_tools_init_1.logger.error(`Error while updating the secret in secrets manager, Error: ${error}`);
                throw error;
            }
        }
        return Status.SUCCESS;
    }
}
exports.UpdateUseCaseCommand = UpdateUseCaseCommand;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateUseCaseCommand' })
], UpdateUseCaseCommand.prototype, "execute", null);
/**
 * Command to delete a use case. A deleted use case simply means the underlying stack is deleted,
 * however the data in the DB as well as settings in SSM are still retained.
 * PermanentlyDeleteUseCaseCommand implements full 'true' deletion.
 */
class DeleteUseCaseCommand {
    constructor() {
        // NOSONAR - typescript:S4144 - this hierarchy is separate from line 152.
        this.stackMgmt = new stack_management_1.StackManagement();
        this.configMgmt = new config_management_1.ConfigManagement();
        this.storageMgmt = new storage_management_1.StorageManagement();
        this.secretMgmt = new secret_management_1.SecretManagement();
    }
    async execute(useCase) {
        try {
            // we need to retrieve the stackId from DDB in order to perform the deletion
            const useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);
            useCase.stackId = useCaseRecord.StackId;
            await this.stackMgmt.deleteStack(useCase);
        }
        catch (error) {
            // If the deletion fails don't add to DLQ. hence do not throw the error
            return Status.FAILED;
        }
        try {
            await this.storageMgmt.markUseCaseRecordForDeletion(useCase);
        }
        catch (error) {
            power_tools_init_1.logger.error(`Error while setting TTL for use case record in DDB, Error: ${error}`);
            throw error;
        }
        if (useCase.requiresAPIKey()) {
            try {
                await this.secretMgmt.deleteSecret(useCase);
            }
            catch (error) {
                power_tools_init_1.logger.error(`Error while creating the secret in secrets manager, Error: ${error}`);
                throw error;
            }
        }
        return Status.SUCCESS;
    }
}
exports.DeleteUseCaseCommand = DeleteUseCaseCommand;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteUseCaseCommand' })
], DeleteUseCaseCommand.prototype, "execute", null);
/**
 * Command to permanently delete a use case, which results in removal of the use case from the use cases table
 */
class PermanentlyDeleteUseCaseCommand {
    // prettier-ignore
    constructor() {
        this.stackMgmt = new stack_management_1.StackManagement();
        this.configMgmt = new config_management_1.ConfigManagement();
        this.storageMgmt = new storage_management_1.StorageManagement();
        this.secretMgmt = new secret_management_1.SecretManagement();
    }
    async execute(useCase) {
        // with a permanent delete, its possible we have already deleted the stack and param, so handling is needed
        let useCaseRecord;
        try {
            useCaseRecord = await this.storageMgmt.getUseCaseRecord(useCase);
            useCase.stackId = useCaseRecord.StackId;
        }
        catch (error) {
            power_tools_init_1.logger.error(`Error while retrieving use case record from DDB, Error: ${error}`);
            throw error;
        }
        try {
            await this.stackMgmt.deleteStack(useCase);
        }
        catch (error) {
            // If the stack is already deleted, we can proceed
            if (error instanceof client_cloudformation_1.StackNotFoundException) {
                power_tools_init_1.logger.warn('Stack does not exist, hence skipping deletion.');
            }
            else {
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
    async deleteDdbRecord(useCase) {
        try {
            await this.storageMgmt.deleteUseCaseRecord(useCase);
        }
        catch (error) {
            power_tools_init_1.logger.error(`Error while deleting use case record in DDB, Error: ${error}`);
            throw error;
        }
    }
    async deleteSecret(useCase) {
        try {
            await this.secretMgmt.deleteSecret(useCase);
        }
        catch (error) {
            if (error instanceof client_secrets_manager_1.ResourceNotFoundException) {
                power_tools_init_1.logger.warn('Secret does not exist, hence skipping deletion.');
            }
            else {
                power_tools_init_1.logger.error(`Error while deleting the secret for the use case, Error: ${error}`);
                throw error;
            }
        }
    }
    async deleteConfig(useCase) {
        try {
            await this.configMgmt.deleteUseCaseConfig(useCase);
        }
        catch (error) {
            if (error instanceof client_ssm_1.ParameterNotFound) {
                power_tools_init_1.logger.warn('Parameter does not exist, hence skipping deletion.');
            }
            else {
                power_tools_init_1.logger.error(`Error while deleting the SSM parameter containing the use case config, Error: ${error}`);
                throw error;
            }
        }
    }
}
exports.PermanentlyDeleteUseCaseCommand = PermanentlyDeleteUseCaseCommand;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###permanentlyDeleteUseCaseCommand' })
], PermanentlyDeleteUseCaseCommand.prototype, "execute", null);
/**
 * Command to list all use cases
 */
class ListUseCasesCommand {
    constructor() {
        /**
         * Formatting the data from ddb, ssm config, and a stack's deployment details to a list of use cases
         * to send to the front end.
         *
         * @param useCaseDeploymentsMap
         * @returns
         */
        this.formatUseCasesToList = (useCaseDeploymentsMap, scannedCount) => {
            // note: future server side sorting may go here
            const formattedData = [];
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
                power_tools_init_1.logger.debug(`Formatted use cases list: ${JSON.stringify(response)}`);
                return response;
            }
            catch (error) {
                power_tools_init_1.logger.error('Deployments data formatting error. Likely use case config JSON parsing error');
                throw error;
            }
        };
        /**
         *
         * @param useCaseRecord Use case record object created from DDB record
         * @returns
         */
        this.createStackInfoFromDdbRecord = (useCaseRecord) => {
            console.debug(`useCaseRecord: ${JSON.stringify(useCaseRecord)}`);
            if (!(0, util_arn_parser_1.validate)(useCaseRecord.StackId)) {
                throw new Error(`Invalid stackId ARN provided in DDB record: ${useCaseRecord.StackId}`);
            }
            const parsedArn = (0, util_arn_parser_1.parse)(useCaseRecord.StackId);
            // parsedArn.resource has the form `stack/stack-name/unique-id`
            // `stack/` has to be removed from the resource to get the valid stack name
            return {
                stackArn: useCaseRecord.StackId,
                stackId: parsedArn.resource.replace('stack/', ''),
                stackInstanceAccount: parsedArn.accountId,
                stackInstanceRegion: parsedArn.region
            };
        };
        this.stackMgmt = new stack_management_1.StackManagement();
        this.storageMgmt = new storage_management_1.StorageManagement();
        this.configMgmt = new config_management_1.ConfigManagement();
    }
    async execute(listUseCasesEvent) {
        power_tools_init_1.logger.debug('Enter ListUseCasesCommand');
        const useCaseDeploymentsMap = new Map();
        let useCaseRecords;
        let scannedCount;
        try {
            const response = await this.storageMgmt.getAllCaseRecords(listUseCasesEvent);
            useCaseRecords = response.useCaseRecords;
            scannedCount = response.scannedCount;
        }
        catch (error) {
            power_tools_init_1.logger.error(`Error while listing the use case records in DDB, Error: ${error}`);
            throw error;
        }
        try {
            for (const element of useCaseRecords) {
                const useCaseRecord = element;
                const stackDetails = await this.stackMgmt.getStackDetails(this.createStackInfoFromDdbRecord(useCaseRecord));
                if (!stackDetails.chatConfigSSMParameterName) {
                    power_tools_init_1.logger.error('ChatConfigSSMParameterName missing in the stack details');
                }
                else {
                    let useCaseConfigDetails;
                    try {
                        useCaseConfigDetails = await this.configMgmt.getUseCaseConfigFromName(stackDetails.chatConfigSSMParameterName);
                    }
                    catch (error) {
                        power_tools_init_1.logger.error(`Error while retrieving the use case config from SSM, Error: ${error}`);
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
        }
        catch (error) {
            power_tools_init_1.logger.error(`Error while listing the stack details, Error: ${error}`);
            throw error;
        }
    }
}
exports.ListUseCasesCommand = ListUseCasesCommand;
__decorate([
    power_tools_init_1.tracer.captureMethod({ captureResponse: true, subSegmentName: '###listUseCasesCommand' })
], ListUseCasesCommand.prototype, "execute", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2NvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt3SEFXd0g7Ozs7Ozs7OztBQUV4SCwwRUFBd0U7QUFDeEUsNEVBQTRFO0FBQzVFLG9EQUF3RDtBQUN4RCw4REFBMkQ7QUFDM0QsNkRBQThFO0FBQzlFLGlFQUE2RDtBQUc3RCx5REFBb0Q7QUFDcEQsMEVBQXNFO0FBQ3RFLCtEQUEyRDtBQUUzRCxJQUFZLE1BR1g7QUFIRCxXQUFZLE1BQU07SUFDZCw2QkFBbUIsQ0FBQTtJQUNuQiwyQkFBaUIsQ0FBQTtBQUNyQixDQUFDLEVBSFcsTUFBTSxzQkFBTixNQUFNLFFBR2pCO0FBWUQ7O0dBRUc7QUFDSCxNQUFzQixrQkFBa0I7SUFNcEM7UUFDSSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksa0NBQWUsRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxzQ0FBaUIsRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxvQ0FBZ0IsRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxvQ0FBZ0IsRUFBRSxDQUFDO0lBQzdDLENBQUM7Q0FPSjtBQWxCRCxnREFrQkM7QUFFRDs7R0FFRztBQUNILE1BQWEsb0JBQXFCLFNBQVEsa0JBQWtCO0lBRTNDLEFBQU4sS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFnQjtRQUNqQyxJQUFJLE9BQWUsQ0FBQztRQUNwQixJQUFJO1lBQ0EsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDcEQsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7U0FDN0I7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNaLHVFQUF1RTtZQUN2RSx5QkFBTSxDQUFDLElBQUksQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO1lB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QkFDWix5QkFBTSxDQUFDLEtBQUssQ0FBQywrREFBK0QsS0FBSyxFQUFFLENBQUMsQ0FBQztxQkFDeEY7b0JBRUQsSUFBSSxvQkFBb0IsRUFBRTt3QkFDdEIscUJBQXFCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUU7NEJBQzdDLGFBQWE7NEJBQ2Isd0JBQXdCLEVBQUUsWUFBWTs0QkFDdEMsb0JBQW9CLEVBQUUsb0JBQW9CO3lCQUM3QyxDQUFDLENBQUM7cUJBQ047aUJBQ0o7YUFDSjtZQUNELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLHFCQUFxQixFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQ3pFO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDWix5QkFBTSxDQUFDLEtBQUssQ0FBQyxpREFBaUQsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUN2RSxNQUFNLEtBQUssQ0FBQztTQUNmO0lBQ0wsQ0FBQztDQTJESjtBQTFIRCxrREEwSEM7QUE5R2dCO0lBRFoseUJBQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxDQUFDO2tEQW9EekYiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7IFN0YWNrTm90Rm91bmRFeGNlcHRpb24gfSBmcm9tICdAYXdzLXNkay9jbGllbnQtY2xvdWRmb3JtYXRpb24nO1xuaW1wb3J0IHsgUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbiB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInO1xuaW1wb3J0IHsgUGFyYW1ldGVyTm90Rm91bmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3NtJztcbmltcG9ydCB7IHBhcnNlLCB2YWxpZGF0ZSB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtYXJuLXBhcnNlcic7XG5pbXBvcnQgeyBTdGFja01hbmFnZW1lbnQsIFVzZUNhc2VTdGFja0RldGFpbHMgfSBmcm9tICcuL2Nmbi9zdGFjay1tYW5hZ2VtZW50JztcbmltcG9ydCB7IFN0b3JhZ2VNYW5hZ2VtZW50IH0gZnJvbSAnLi9kZGIvc3RvcmFnZS1tYW5hZ2VtZW50JztcbmltcG9ydCB7IExpc3RVc2VDYXNlc0FkYXB0ZXIsIFN0YWNrSW5mbywgVXNlQ2FzZVJlY29yZCB9IGZyb20gJy4vbW9kZWwvbGlzdC11c2UtY2FzZXMnO1xuaW1wb3J0IHsgVXNlQ2FzZSB9IGZyb20gJy4vbW9kZWwvdXNlLWNhc2UnO1xuaW1wb3J0IHsgbG9nZ2VyLCB0cmFjZXIgfSBmcm9tICcuL3Bvd2VyLXRvb2xzLWluaXQnO1xuaW1wb3J0IHsgU2VjcmV0TWFuYWdlbWVudCB9IGZyb20gJy4vc2VjcmV0c21hbmFnZXIvc2VjcmV0LW1hbmFnZW1lbnQnO1xuaW1wb3J0IHsgQ29uZmlnTWFuYWdlbWVudCB9IGZyb20gJy4vc3NtL2NvbmZpZy1tYW5hZ2VtZW50JztcblxuZXhwb3J0IGVudW0gU3RhdHVzIHtcbiAgICBTVUNDRVNTID0gJ1NVQ0NFU1MnLFxuICAgIEZBSUxFRCA9ICdGQUlMRUQnXG59XG5cbmV4cG9ydCB0eXBlIERlcGxveW1lbnREZXRhaWxzID0ge1xuICAgIHVzZUNhc2VSZWNvcmQ6IFVzZUNhc2VSZWNvcmQ7XG4gICAgdXNlQ2FzZURlcGxveW1lbnREZXRhaWxzOiBVc2VDYXNlU3RhY2tEZXRhaWxzO1xuICAgIHVzZUNhc2VDb25maWdEZXRhaWxzOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIENhc2VDb21tYW5kIHtcbiAgICBleGVjdXRlKHVzZUNhc2U6IFVzZUNhc2UgfCBMaXN0VXNlQ2FzZXNBZGFwdGVyKTogUHJvbWlzZTxhbnk+O1xufVxuXG4vKipcbiAqIENvbW1hbmQgaW50ZXJmYWNlIHRvIGRlZmluZSBvcGVyYXRpb25zIG9uIHVzZSBjYXNlcyB0aGF0IHRoZSBkZXBsb3ltZW50IHN0YWNrIG1hbmFnZXNcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFVzZUNhc2VNZ210Q29tbWFuZCBpbXBsZW1lbnRzIENhc2VDb21tYW5kIHtcbiAgICBzdGFja01nbXQ6IFN0YWNrTWFuYWdlbWVudDtcbiAgICBzdG9yYWdlTWdtdDogU3RvcmFnZU1hbmFnZW1lbnQ7XG4gICAgY29uZmlnTWdtdDogQ29uZmlnTWFuYWdlbWVudDtcbiAgICBzZWNyZXRNZ210OiBTZWNyZXRNYW5hZ2VtZW50O1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuc3RhY2tNZ210ID0gbmV3IFN0YWNrTWFuYWdlbWVudCgpO1xuICAgICAgICB0aGlzLnN0b3JhZ2VNZ210ID0gbmV3IFN0b3JhZ2VNYW5hZ2VtZW50KCk7XG4gICAgICAgIHRoaXMuY29uZmlnTWdtdCA9IG5ldyBDb25maWdNYW5hZ2VtZW50KCk7XG4gICAgICAgIHRoaXMuc2VjcmV0TWdtdCA9IG5ldyBTZWNyZXRNYW5hZ2VtZW50KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1ldGhvZCBhbGwgY29tbWFuZCBleHRlbnNpb25zIG11c3QgaW1wbGVtZW50XG4gICAgICogQHBhcmFtIHVzZUNhc2VcbiAgICAgKi9cbiAgICBhYnN0cmFjdCBleGVjdXRlKHVzZUNhc2U6IFVzZUNhc2UpOiBQcm9taXNlPGFueT47XG59XG5cbi8qKlxuICogQ29tbWFuZCB0byBjcmVhdGUgYSBuZXcgdXNlIGNhc2VcbiAqL1xuZXhwb3J0IGNsYXNzIENyZWF0ZVVzZUNhc2VDb21tYW5kIGV4dGVuZHMgVXNlQ2FzZU1nbXRDb21tYW5kIHtcbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IHRydWUsIHN1YlNlZ21lbnROYW1lOiAnIyMjY3JlYXRlVXNlQ2FzZUNvbW1hbmQnIH0pXG4gICAgcHVibGljIGFzeW5jIGV4ZWN1dGUodXNlQ2FzZTogVXNlQ2FzZSk6IFByb21pc2U8U3RhdHVzPiB7XG4gICAgICAgIGxldCBzdGFja0lkOiBzdHJpbmc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGFja0lkID0gYXdhaXQgdGhpcy5zdGFja01nbXQuY3JlYXRlU3RhY2sodXNlQ2FzZSk7XG4gICAgICAgICAgICB1c2VDYXNlLnN0YWNrSWQgPSBzdGFja0lkO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gSWYgdGhlIGNyZWF0aW9uIGZhaWxzIGRvbid0IGFkZCB0byBETFEuIGhlbmNlIGRvIG5vdCB0aHJvdyB0aGUgZXJyb3JcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKCdTdGFjayBjcmVhdGlvbiBmYWlsZWQsIGhlbmNlIGFib3J0aW5nIGZ1cnRoZXIgc3RlcHMnKTtcbiAgICAgICAgICAgIHJldHVybiBTdGF0dXMuRkFJTEVEO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3RvcmFnZU1nbXQuY3JlYXRlVXNlQ2FzZVJlY29yZCh1c2VDYXNlKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgaW5zZXJ0aW5nIHVzZSBjYXNlIHJlY29yZCBpbiBEREIsIEVycm9yOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb25maWdNZ210LmNyZWF0ZVVzZUNhc2VDb25maWcodXNlQ2FzZSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIHdoaWxlIGNyZWF0aW5nIHRoZSBTU00gcGFyYW1ldGVyIGNvbnRhaW5pbmcgdGhlIHVzZSBjYXNlIGNvbmZpZywgRXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1c2VDYXNlLnJlcXVpcmVzQVBJS2V5KCkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZWNyZXRNZ210LmNyZWF0ZVNlY3JldCh1c2VDYXNlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGlsZSBjcmVhdGluZyB0aGUgc2VjcmV0IGluIHNlY3JldHMgbWFuYWdlciwgRXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gU3RhdHVzLlNVQ0NFU1M7XG4gICAgfVxufVxuXG4vKipcbiAqIENvbW1hbmQgdG8gdXBkYXRlIGEgdXNlIGNhc2VcbiAqL1xuZXhwb3J0IGNsYXNzIFVwZGF0ZVVzZUNhc2VDb21tYW5kIGV4dGVuZHMgVXNlQ2FzZU1nbXRDb21tYW5kIHtcbiAgICBAdHJhY2VyLmNhcHR1cmVNZXRob2QoeyBjYXB0dXJlUmVzcG9uc2U6IHRydWUsIHN1YlNlZ21lbnROYW1lOiAnIyMjdXBkYXRlVXNlQ2FzZUNvbW1hbmQnIH0pXG4gICAgcHVibGljIGFzeW5jIGV4ZWN1dGUodXNlQ2FzZTogVXNlQ2FzZSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGxldCBvbGRTU01QYXJhbU5hbWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB1c2VDYXNlUmVjb3JkID0gYXdhaXQgdGhpcy5zdG9yYWdlTWdtdC5nZXRVc2VDYXNlUmVjb3JkKHVzZUNhc2UpO1xuICAgICAgICAgICAgb2xkU1NNUGFyYW1OYW1lID0gdXNlQ2FzZVJlY29yZC5TU01QYXJhbWV0ZXJLZXk7XG4gICAgICAgICAgICB1c2VDYXNlLnN0YWNrSWQgPSB1c2VDYXNlUmVjb3JkLlN0YWNrSWQ7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN0YWNrTWdtdC51cGRhdGVTdGFjayh1c2VDYXNlKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSB1cGRhdGUgZmFpbHMgZG9uJ3QgYWRkIHRvIERMUS4gaGVuY2UgZG8gbm90IHRocm93IHRoZSBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIFN0YXR1cy5GQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3RvcmFnZU1nbXQudXBkYXRlVXNlQ2FzZVJlY29yZCh1c2VDYXNlKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgdXBkYXRpbmcgdXNlIGNhc2UgcmVjb3JkIGluIEREQiwgRXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb25maWdNZ210LnVwZGF0ZVVzZUNhc2VDb25maWcodXNlQ2FzZSwgb2xkU1NNUGFyYW1OYW1lKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgdXBkYXRpbmcgdGhlIFNTTSBwYXJhbWV0ZXIgY29udGFpbmluZyB0aGUgdXNlIGNhc2UgY29uZmlnLCBFcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1c2VDYXNlLnJlcXVpcmVzQVBJS2V5KCkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZWNyZXRNZ210LnVwZGF0ZVNlY3JldCh1c2VDYXNlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGlsZSB1cGRhdGluZyB0aGUgc2VjcmV0IGluIHNlY3JldHMgbWFuYWdlciwgRXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gU3RhdHVzLlNVQ0NFU1M7XG4gICAgfVxufVxuXG4vKipcbiAqIENvbW1hbmQgdG8gZGVsZXRlIGEgdXNlIGNhc2UuIEEgZGVsZXRlZCB1c2UgY2FzZSBzaW1wbHkgbWVhbnMgdGhlIHVuZGVybHlpbmcgc3RhY2sgaXMgZGVsZXRlZCxcbiAqIGhvd2V2ZXIgdGhlIGRhdGEgaW4gdGhlIERCIGFzIHdlbGwgYXMgc2V0dGluZ3MgaW4gU1NNIGFyZSBzdGlsbCByZXRhaW5lZC5cbiAqIFBlcm1hbmVudGx5RGVsZXRlVXNlQ2FzZUNvbW1hbmQgaW1wbGVtZW50cyBmdWxsICd0cnVlJyBkZWxldGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIERlbGV0ZVVzZUNhc2VDb21tYW5kIGltcGxlbWVudHMgQ2FzZUNvbW1hbmQge1xuICAgIHN0YWNrTWdtdDogU3RhY2tNYW5hZ2VtZW50O1xuICAgIGNvbmZpZ01nbXQ6IENvbmZpZ01hbmFnZW1lbnQ7XG4gICAgc3RvcmFnZU1nbXQ6IFN0b3JhZ2VNYW5hZ2VtZW50O1xuICAgIHNlY3JldE1nbXQ6IFNlY3JldE1hbmFnZW1lbnQ7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgLy8gTk9TT05BUiAtIHR5cGVzY3JpcHQ6UzQxNDQgLSB0aGlzIGhpZXJhcmNoeSBpcyBzZXBhcmF0ZSBmcm9tIGxpbmUgMTUyLlxuICAgICAgICB0aGlzLnN0YWNrTWdtdCA9IG5ldyBTdGFja01hbmFnZW1lbnQoKTtcbiAgICAgICAgdGhpcy5jb25maWdNZ210ID0gbmV3IENvbmZpZ01hbmFnZW1lbnQoKTtcbiAgICAgICAgdGhpcy5zdG9yYWdlTWdtdCA9IG5ldyBTdG9yYWdlTWFuYWdlbWVudCgpO1xuICAgICAgICB0aGlzLnNlY3JldE1nbXQgPSBuZXcgU2VjcmV0TWFuYWdlbWVudCgpO1xuICAgIH1cblxuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogdHJ1ZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNkZWxldGVVc2VDYXNlQ29tbWFuZCcgfSlcbiAgICBwdWJsaWMgYXN5bmMgZXhlY3V0ZSh1c2VDYXNlOiBVc2VDYXNlKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHdlIG5lZWQgdG8gcmV0cmlldmUgdGhlIHN0YWNrSWQgZnJvbSBEREIgaW4gb3JkZXIgdG8gcGVyZm9ybSB0aGUgZGVsZXRpb25cbiAgICAgICAgICAgIGNvbnN0IHVzZUNhc2VSZWNvcmQgPSBhd2FpdCB0aGlzLnN0b3JhZ2VNZ210LmdldFVzZUNhc2VSZWNvcmQodXNlQ2FzZSk7XG4gICAgICAgICAgICB1c2VDYXNlLnN0YWNrSWQgPSB1c2VDYXNlUmVjb3JkLlN0YWNrSWQ7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN0YWNrTWdtdC5kZWxldGVTdGFjayh1c2VDYXNlKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSBkZWxldGlvbiBmYWlscyBkb24ndCBhZGQgdG8gRExRLiBoZW5jZSBkbyBub3QgdGhyb3cgdGhlIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gU3RhdHVzLkZBSUxFRDtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdG9yYWdlTWdtdC5tYXJrVXNlQ2FzZVJlY29yZEZvckRlbGV0aW9uKHVzZUNhc2UpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGlsZSBzZXR0aW5nIFRUTCBmb3IgdXNlIGNhc2UgcmVjb3JkIGluIEREQiwgRXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodXNlQ2FzZS5yZXF1aXJlc0FQSUtleSgpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2VjcmV0TWdtdC5kZWxldGVTZWNyZXQodXNlQ2FzZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgY3JlYXRpbmcgdGhlIHNlY3JldCBpbiBzZWNyZXRzIG1hbmFnZXIsIEVycm9yOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBTdGF0dXMuU1VDQ0VTUztcbiAgICB9XG59XG5cbi8qKlxuICogQ29tbWFuZCB0byBwZXJtYW5lbnRseSBkZWxldGUgYSB1c2UgY2FzZSwgd2hpY2ggcmVzdWx0cyBpbiByZW1vdmFsIG9mIHRoZSB1c2UgY2FzZSBmcm9tIHRoZSB1c2UgY2FzZXMgdGFibGVcbiAqL1xuZXhwb3J0IGNsYXNzIFBlcm1hbmVudGx5RGVsZXRlVXNlQ2FzZUNvbW1hbmQgaW1wbGVtZW50cyBDYXNlQ29tbWFuZCB7XG4gICAgc3RhY2tNZ210OiBTdGFja01hbmFnZW1lbnQ7XG4gICAgY29uZmlnTWdtdDogQ29uZmlnTWFuYWdlbWVudDtcbiAgICBzdG9yYWdlTWdtdDogU3RvcmFnZU1hbmFnZW1lbnQ7XG4gICAgc2VjcmV0TWdtdDogU2VjcmV0TWFuYWdlbWVudDtcblxuICAgIC8vIHByZXR0aWVyLWlnbm9yZVxuICAgIGNvbnN0cnVjdG9yKCkgeyAvLyBOT1NPTkFSIC0gdHlwZXNjcmlwdDpTNDE0NCAtIHRoaXMgaGllcmFyY2h5IGlzIHNlcGFyYXRlIGZyb20gbGluZSAxNTIuXG4gICAgICAgIHRoaXMuc3RhY2tNZ210ID0gbmV3IFN0YWNrTWFuYWdlbWVudCgpO1xuICAgICAgICB0aGlzLmNvbmZpZ01nbXQgPSBuZXcgQ29uZmlnTWFuYWdlbWVudCgpO1xuICAgICAgICB0aGlzLnN0b3JhZ2VNZ210ID0gbmV3IFN0b3JhZ2VNYW5hZ2VtZW50KCk7XG4gICAgICAgIHRoaXMuc2VjcmV0TWdtdCA9IG5ldyBTZWNyZXRNYW5hZ2VtZW50KCk7XG4gICAgfVxuXG4gICAgQHRyYWNlci5jYXB0dXJlTWV0aG9kKHsgY2FwdHVyZVJlc3BvbnNlOiB0cnVlLCBzdWJTZWdtZW50TmFtZTogJyMjI3Blcm1hbmVudGx5RGVsZXRlVXNlQ2FzZUNvbW1hbmQnIH0pXG4gICAgcHVibGljIGFzeW5jIGV4ZWN1dGUodXNlQ2FzZTogVXNlQ2FzZSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIC8vIHdpdGggYSBwZXJtYW5lbnQgZGVsZXRlLCBpdHMgcG9zc2libGUgd2UgaGF2ZSBhbHJlYWR5IGRlbGV0ZWQgdGhlIHN0YWNrIGFuZCBwYXJhbSwgc28gaGFuZGxpbmcgaXMgbmVlZGVkXG4gICAgICAgIGxldCB1c2VDYXNlUmVjb3JkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdXNlQ2FzZVJlY29yZCA9IGF3YWl0IHRoaXMuc3RvcmFnZU1nbXQuZ2V0VXNlQ2FzZVJlY29yZCh1c2VDYXNlKTtcbiAgICAgICAgICAgIHVzZUNhc2Uuc3RhY2tJZCA9IHVzZUNhc2VSZWNvcmQuU3RhY2tJZDtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgcmV0cmlldmluZyB1c2UgY2FzZSByZWNvcmQgZnJvbSBEREIsIEVycm9yOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdGFja01nbXQuZGVsZXRlU3RhY2sodXNlQ2FzZSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgc3RhY2sgaXMgYWxyZWFkeSBkZWxldGVkLCB3ZSBjYW4gcHJvY2VlZFxuICAgICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgU3RhY2tOb3RGb3VuZEV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKCdTdGFjayBkb2VzIG5vdCBleGlzdCwgaGVuY2Ugc2tpcHBpbmcgZGVsZXRpb24uJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBkZWxldGlvbiBmYWlscyBkb24ndCBhZGQgdG8gRExRLiBoZW5jZSBkbyBub3QgdGhyb3cgdGhlIGVycm9yXG4gICAgICAgICAgICAgICAgcmV0dXJuIFN0YXR1cy5GQUlMRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB1c2VDYXNlLnNldFNTTVBhcmFtZXRlcktleSh1c2VDYXNlUmVjb3JkLlNTTVBhcmFtZXRlcktleSk7XG4gICAgICAgIGF3YWl0IHRoaXMuZGVsZXRlRGRiUmVjb3JkKHVzZUNhc2UpO1xuICAgICAgICBhd2FpdCB0aGlzLmRlbGV0ZUNvbmZpZyh1c2VDYXNlKTtcblxuICAgICAgICBpZiAodXNlQ2FzZS5yZXF1aXJlc0FQSUtleSgpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRlbGV0ZVNlY3JldCh1c2VDYXNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBTdGF0dXMuU1VDQ0VTUztcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGRlbGV0ZURkYlJlY29yZCh1c2VDYXNlOiBVc2VDYXNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN0b3JhZ2VNZ210LmRlbGV0ZVVzZUNhc2VSZWNvcmQodXNlQ2FzZSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIHdoaWxlIGRlbGV0aW5nIHVzZSBjYXNlIHJlY29yZCBpbiBEREIsIEVycm9yOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGRlbGV0ZVNlY3JldCh1c2VDYXNlOiBVc2VDYXNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNlY3JldE1nbXQuZGVsZXRlU2VjcmV0KHVzZUNhc2UpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKCdTZWNyZXQgZG9lcyBub3QgZXhpc3QsIGhlbmNlIHNraXBwaW5nIGRlbGV0aW9uLicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIHdoaWxlIGRlbGV0aW5nIHRoZSBzZWNyZXQgZm9yIHRoZSB1c2UgY2FzZSwgRXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGRlbGV0ZUNvbmZpZyh1c2VDYXNlOiBVc2VDYXNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNvbmZpZ01nbXQuZGVsZXRlVXNlQ2FzZUNvbmZpZyh1c2VDYXNlKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFBhcmFtZXRlck5vdEZvdW5kKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oJ1BhcmFtZXRlciBkb2VzIG5vdCBleGlzdCwgaGVuY2Ugc2tpcHBpbmcgZGVsZXRpb24uJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgZGVsZXRpbmcgdGhlIFNTTSBwYXJhbWV0ZXIgY29udGFpbmluZyB0aGUgdXNlIGNhc2UgY29uZmlnLCBFcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiBDb21tYW5kIHRvIGxpc3QgYWxsIHVzZSBjYXNlc1xuICovXG5leHBvcnQgY2xhc3MgTGlzdFVzZUNhc2VzQ29tbWFuZCBpbXBsZW1lbnRzIENhc2VDb21tYW5kIHtcbiAgICBzdGFja01nbXQ6IFN0YWNrTWFuYWdlbWVudDtcbiAgICBzdG9yYWdlTWdtdDogU3RvcmFnZU1hbmFnZW1lbnQ7XG4gICAgY29uZmlnTWdtdDogQ29uZmlnTWFuYWdlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnN0YWNrTWdtdCA9IG5ldyBTdGFja01hbmFnZW1lbnQoKTtcbiAgICAgICAgdGhpcy5zdG9yYWdlTWdtdCA9IG5ldyBTdG9yYWdlTWFuYWdlbWVudCgpO1xuICAgICAgICB0aGlzLmNvbmZpZ01nbXQgPSBuZXcgQ29uZmlnTWFuYWdlbWVudCgpO1xuICAgIH1cblxuICAgIEB0cmFjZXIuY2FwdHVyZU1ldGhvZCh7IGNhcHR1cmVSZXNwb25zZTogdHJ1ZSwgc3ViU2VnbWVudE5hbWU6ICcjIyNsaXN0VXNlQ2FzZXNDb21tYW5kJyB9KVxuICAgIHB1YmxpYyBhc3luYyBleGVjdXRlKGxpc3RVc2VDYXNlc0V2ZW50OiBMaXN0VXNlQ2FzZXNBZGFwdGVyKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdFbnRlciBMaXN0VXNlQ2FzZXNDb21tYW5kJyk7XG5cbiAgICAgICAgY29uc3QgdXNlQ2FzZURlcGxveW1lbnRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIERlcGxveW1lbnREZXRhaWxzPigpO1xuXG4gICAgICAgIGxldCB1c2VDYXNlUmVjb3JkczogVXNlQ2FzZVJlY29yZFtdO1xuICAgICAgICBsZXQgc2Nhbm5lZENvdW50OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zdG9yYWdlTWdtdC5nZXRBbGxDYXNlUmVjb3JkcyhsaXN0VXNlQ2FzZXNFdmVudCk7XG4gICAgICAgICAgICB1c2VDYXNlUmVjb3JkcyA9IHJlc3BvbnNlLnVzZUNhc2VSZWNvcmRzO1xuICAgICAgICAgICAgc2Nhbm5lZENvdW50ID0gcmVzcG9uc2Uuc2Nhbm5lZENvdW50O1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGlsZSBsaXN0aW5nIHRoZSB1c2UgY2FzZSByZWNvcmRzIGluIEREQiwgRXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdXNlQ2FzZVJlY29yZHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1c2VDYXNlUmVjb3JkID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFja0RldGFpbHMgPSBhd2FpdCB0aGlzLnN0YWNrTWdtdC5nZXRTdGFja0RldGFpbHMoXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlU3RhY2tJbmZvRnJvbURkYlJlY29yZCh1c2VDYXNlUmVjb3JkKVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXN0YWNrRGV0YWlscy5jaGF0Q29uZmlnU1NNUGFyYW1ldGVyTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0NoYXRDb25maWdTU01QYXJhbWV0ZXJOYW1lIG1pc3NpbmcgaW4gdGhlIHN0YWNrIGRldGFpbHMnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdXNlQ2FzZUNvbmZpZ0RldGFpbHM7XG5cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZUNhc2VDb25maWdEZXRhaWxzID0gYXdhaXQgdGhpcy5jb25maWdNZ210LmdldFVzZUNhc2VDb25maWdGcm9tTmFtZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFja0RldGFpbHMuY2hhdENvbmZpZ1NTTVBhcmFtZXRlck5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIHdoaWxlIHJldHJpZXZpbmcgdGhlIHVzZSBjYXNlIGNvbmZpZyBmcm9tIFNTTSwgRXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAodXNlQ2FzZUNvbmZpZ0RldGFpbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZUNhc2VEZXBsb3ltZW50c01hcC5zZXQodXNlQ2FzZVJlY29yZC5TdGFja0lkLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlQ2FzZVJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VDYXNlRGVwbG95bWVudERldGFpbHM6IHN0YWNrRGV0YWlscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VDYXNlQ29uZmlnRGV0YWlsczogdXNlQ2FzZUNvbmZpZ0RldGFpbHNcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0VXNlQ2FzZXNUb0xpc3QodXNlQ2FzZURlcGxveW1lbnRzTWFwLCBzY2FubmVkQ291bnQpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGlsZSBsaXN0aW5nIHRoZSBzdGFjayBkZXRhaWxzLCBFcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0dGluZyB0aGUgZGF0YSBmcm9tIGRkYiwgc3NtIGNvbmZpZywgYW5kIGEgc3RhY2sncyBkZXBsb3ltZW50IGRldGFpbHMgdG8gYSBsaXN0IG9mIHVzZSBjYXNlc1xuICAgICAqIHRvIHNlbmQgdG8gdGhlIGZyb250IGVuZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB1c2VDYXNlRGVwbG95bWVudHNNYXBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqL1xuICAgIHByaXZhdGUgZm9ybWF0VXNlQ2FzZXNUb0xpc3QgPSAoXG4gICAgICAgIHVzZUNhc2VEZXBsb3ltZW50c01hcDogTWFwPHN0cmluZywgRGVwbG95bWVudERldGFpbHM+LFxuICAgICAgICBzY2FubmVkQ291bnQ6IG51bWJlciB8IHVuZGVmaW5lZFxuICAgICk6IGFueSA9PiB7XG4gICAgICAgIC8vIG5vdGU6IGZ1dHVyZSBzZXJ2ZXIgc2lkZSBzb3J0aW5nIG1heSBnbyBoZXJlXG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZERhdGE6IGFueSA9IFtdO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdXNlQ2FzZURlcGxveW1lbnRzTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAuLi52YWx1ZS51c2VDYXNlUmVjb3JkLFxuICAgICAgICAgICAgICAgICAgICAuLi52YWx1ZS51c2VDYXNlRGVwbG95bWVudERldGFpbHMsXG4gICAgICAgICAgICAgICAgICAgIC4uLkpTT04ucGFyc2UodmFsdWUudXNlQ2FzZUNvbmZpZ0RldGFpbHMpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgZGVwbG95bWVudHM6IGZvcm1hdHRlZERhdGEsXG4gICAgICAgICAgICAgICAgc2Nhbm5lZENvdW50OiBzY2FubmVkQ291bnRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhgRm9ybWF0dGVkIHVzZSBjYXNlcyBsaXN0OiAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1gKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRGVwbG95bWVudHMgZGF0YSBmb3JtYXR0aW5nIGVycm9yLiBMaWtlbHkgdXNlIGNhc2UgY29uZmlnIEpTT04gcGFyc2luZyBlcnJvcicpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXNlQ2FzZVJlY29yZCBVc2UgY2FzZSByZWNvcmQgb2JqZWN0IGNyZWF0ZWQgZnJvbSBEREIgcmVjb3JkXG4gICAgICogQHJldHVybnNcbiAgICAgKi9cbiAgICBwcml2YXRlIGNyZWF0ZVN0YWNrSW5mb0Zyb21EZGJSZWNvcmQgPSAodXNlQ2FzZVJlY29yZDogVXNlQ2FzZVJlY29yZCk6IFN0YWNrSW5mbyA9PiB7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoYHVzZUNhc2VSZWNvcmQ6ICR7SlNPTi5zdHJpbmdpZnkodXNlQ2FzZVJlY29yZCl9YCk7XG4gICAgICAgIGlmICghdmFsaWRhdGUodXNlQ2FzZVJlY29yZC5TdGFja0lkKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHN0YWNrSWQgQVJOIHByb3ZpZGVkIGluIEREQiByZWNvcmQ6ICR7dXNlQ2FzZVJlY29yZC5TdGFja0lkfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhcnNlZEFybiA9IHBhcnNlKHVzZUNhc2VSZWNvcmQuU3RhY2tJZCk7XG5cbiAgICAgICAgLy8gcGFyc2VkQXJuLnJlc291cmNlIGhhcyB0aGUgZm9ybSBgc3RhY2svc3RhY2stbmFtZS91bmlxdWUtaWRgXG4gICAgICAgIC8vIGBzdGFjay9gIGhhcyB0byBiZSByZW1vdmVkIGZyb20gdGhlIHJlc291cmNlIHRvIGdldCB0aGUgdmFsaWQgc3RhY2sgbmFtZVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGFja0FybjogdXNlQ2FzZVJlY29yZC5TdGFja0lkLFxuICAgICAgICAgICAgc3RhY2tJZDogcGFyc2VkQXJuLnJlc291cmNlLnJlcGxhY2UoJ3N0YWNrLycsICcnKSxcbiAgICAgICAgICAgIHN0YWNrSW5zdGFuY2VBY2NvdW50OiBwYXJzZWRBcm4uYWNjb3VudElkLFxuICAgICAgICAgICAgc3RhY2tJbnN0YW5jZVJlZ2lvbjogcGFyc2VkQXJuLnJlZ2lvblxuICAgICAgICB9IGFzIFN0YWNrSW5mbztcbiAgICB9O1xufVxuIl19