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
import { StackInfo } from '../model/list-use-cases';
import { UseCase } from '../model/use-case';
export interface UseCaseStackDetails {
    status: string | undefined;
    webConfigKey: string | undefined;
    chatConfigSSMParameterName: string | undefined;
    cloudFrontWebUrl: string | undefined;
    defaultUserEmail: string | undefined;
    kendraIndexId: string | undefined;
    cloudwatchDashboardUrl: string | undefined;
    useCaseUUID: string | undefined;
    ragEnabled: string | undefined;
    providerApiKeySecret: string | undefined;
}
/**
 * Class to manage use case stacks
 */
export declare class StackManagement {
    private cfnClient;
    private ssmClient;
    constructor();
    /**
     * Method that creates a use case stack using cloudformation
     *
     * @param useCase - the parameters required to pass to cloudformation
     * @returns stackId - the id of the created stack
     */
    createStack(useCase: UseCase): Promise<string>;
    /**
     * Method to delete a use case stack
     *
     * @param stackId
     */
    updateStack(useCase: UseCase): Promise<string>;
    /**
     * Method to update a use case stack
     *
     * @param stackId
     */
    deleteStack(useCase: UseCase): Promise<void>;
    /**
     * Method to view the details of a use case stack
     */
    getStackDetails(stackInfo: StackInfo): Promise<UseCaseStackDetails>;
    /**
     * Parse the stack details to get a subset of the required details
     * @param stackDetails response of describe stack for a single stack
     */
    private static parseStackDetails;
}
