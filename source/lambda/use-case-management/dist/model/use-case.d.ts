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
import { APIGatewayEvent } from 'aws-lambda';
/**
 * Data Model to store capture use case specific information
 */
export declare class UseCase {
    /**
     * The unique identifier of the use case.
     */
    readonly useCaseId: string;
    /**
     * Name of the use case to be deployed
     */
    readonly name: string;
    /**
     * Description of the use case to be deployed
     */
    readonly description?: string;
    /**
     * ID of the user requesting the creation of the use case
     */
    readonly userId: string;
    /**
     * CloudFormation parameters to be passed to the use case (stored as a Map)
     */
    cfnParameters?: Map<string, string>;
    /**
     * Name of the provider for the use case
     */
    readonly providerName: string;
    /**
     * Additional configuration for the use case, stored as a JSON object in SSM
     */
    configuration: Object;
    /**
     * The template which should be used to deploy the use case
     */
    templateName: string;
    /**
     * 8-character sliced UUID (derived from useCaseId) to append to CFN resources
     */
    shortUUID: string;
    /**
     * 3rd party API key to be used for the use case
     */
    apiKey?: string;
    /**
     * The ID of the stack that was created. This is used for update and delete stacks.
     */
    _stackId: string;
    constructor(//NOSONAR - typescript:S107 - data model class hence needs primitive types as parameters
    useCaseId: string, name: string, description: string | undefined, cfnParameters: Map<string, string> | undefined, configuration: Object, userId: string, providerName: string, useCaseType: string, apiKey?: string);
    get stackId(): string;
    set stackId(stackId: string);
    getSSMParameterKey(): string | undefined;
    setSSMParameterKey(ssmParameterKey: string): void;
    /**
     * Performs a deep copy of this object, preserving methods and property values
     *
     * @returns a deep copy of the object
     */
    clone(): UseCase;
    requiresAPIKey(): boolean;
}
/**
 * Adapter implementation for @UseCase to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require detailed information about the use case to perform the action,
 * specifically deployments and updates
 */
export declare class ChatUseCaseDeploymentAdapter extends UseCase {
    constructor(event: APIGatewayEvent);
    private static createCfnParameters;
    private static setParameterIfExists;
    private static createConfiguration;
    private static generateShortUUID;
}
/**
 * Adapter implementation for @UseCase to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require only the use case ID and user, such as deletion,
 * permanent deletion, and getting info on a single use case
 */
export declare class ChatUseCaseInfoAdapter extends UseCase {
    constructor(event: APIGatewayEvent);
}
