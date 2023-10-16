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
import { StackManagement, UseCaseStackDetails } from './cfn/stack-management';
import { StorageManagement } from './ddb/storage-management';
import { ListUseCasesAdapter, UseCaseRecord } from './model/list-use-cases';
import { UseCase } from './model/use-case';
import { SecretManagement } from './secretsmanager/secret-management';
import { ConfigManagement } from './ssm/config-management';
export declare enum Status {
    SUCCESS = "SUCCESS",
    FAILED = "FAILED"
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
export declare abstract class UseCaseMgmtCommand implements CaseCommand {
    stackMgmt: StackManagement;
    storageMgmt: StorageManagement;
    configMgmt: ConfigManagement;
    secretMgmt: SecretManagement;
    constructor();
    /**
     * The method all command extensions must implement
     * @param useCase
     */
    abstract execute(useCase: UseCase): Promise<any>;
}
/**
 * Command to create a new use case
 */
export declare class CreateUseCaseCommand extends UseCaseMgmtCommand {
    execute(useCase: UseCase): Promise<Status>;
}
/**
 * Command to update a use case
 */
export declare class UpdateUseCaseCommand extends UseCaseMgmtCommand {
    execute(useCase: UseCase): Promise<any>;
}
/**
 * Command to delete a use case. A deleted use case simply means the underlying stack is deleted,
 * however the data in the DB as well as settings in SSM are still retained.
 * PermanentlyDeleteUseCaseCommand implements full 'true' deletion.
 */
export declare class DeleteUseCaseCommand implements CaseCommand {
    stackMgmt: StackManagement;
    configMgmt: ConfigManagement;
    storageMgmt: StorageManagement;
    secretMgmt: SecretManagement;
    constructor();
    execute(useCase: UseCase): Promise<any>;
}
/**
 * Command to permanently delete a use case, which results in removal of the use case from the use cases table
 */
export declare class PermanentlyDeleteUseCaseCommand implements CaseCommand {
    stackMgmt: StackManagement;
    configMgmt: ConfigManagement;
    storageMgmt: StorageManagement;
    secretMgmt: SecretManagement;
    constructor();
    execute(useCase: UseCase): Promise<any>;
    private deleteDdbRecord;
    private deleteSecret;
    private deleteConfig;
}
/**
 * Command to list all use cases
 */
export declare class ListUseCasesCommand implements CaseCommand {
    stackMgmt: StackManagement;
    storageMgmt: StorageManagement;
    configMgmt: ConfigManagement;
    constructor();
    execute(listUseCasesEvent: ListUseCasesAdapter): Promise<any>;
    /**
     * Formatting the data from ddb, ssm config, and a stack's deployment details to a list of use cases
     * to send to the front end.
     *
     * @param useCaseDeploymentsMap
     * @returns
     */
    private formatUseCasesToList;
    /**
     *
     * @param useCaseRecord Use case record object created from DDB record
     * @returns
     */
    private createStackInfoFromDdbRecord;
}
