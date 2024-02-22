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
import * as crypto from 'crypto';
import { MissingValueError } from '../exception/missing-value-error';
import { logger } from '../power-tools-init';
import {
    COGNITO_POLICY_TABLE_ENV_VAR,
    CfnParameterKeys,
    EXTERNAL_PROVIDERS,
    IS_INTERNAL_USER_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    PROVIDERS_REQUIRING_API_KEY,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_API_KEY_SUFFIX_ENV_VAR,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR
} from '../utils/constants';

/**
 * Interface to describe a record in the ModelInfo dynamoDB table
 */
export interface ModelInfoRecord {
    UseCase: string;
    SortKey: string;
    ModelProviderName: string;
    ModelName: string;
    AllowsStreaming: boolean;
    Prompt: string;
    DefaultTemperature: number;
}

export interface LlmParams {
    ModelProvider?: string;
    ModelId?: string;
    InferenceEndpoint?: string;
    ModelParams?: Object;
    ModelInputPayloadSchema?: Object;
    ModelOutputJSONPath?: string;
    PromptTemplate?: string;
    Temperature?: number;
    RAGEnabled?: boolean;
    Streaming?: boolean;
    Verbose?: boolean;
}

export interface UseCaseConfiguration {
    UseCaseName?: string;
    ConversationMemoryType?: string;
    ConversationMemoryParams?: Object;
    KnowledgeBaseType?: string;
    KnowledgeBaseParams?: Object;
    LlmParams?: LlmParams;
    IsInternalUser?: string;
}

/**
 * Data Model to store capture use case specific information
 */
export class UseCase {
    /**
     * The unique identifier of the use case.
     */
    public readonly useCaseId: string;

    /**
     * Name of the use case to be deployed
     */
    public readonly name: string;

    /**
     * Description of the use case to be deployed
     */
    public readonly description?: string;

    /**
     * ID of the user requesting the creation of the use case
     */
    public readonly userId: string;

    /**
     * CloudFormation parameters to be passed to the use case (stored as a Map)
     */
    public cfnParameters?: Map<string, string>;

    /**
     * Name of the provider for the use case
     */
    public readonly providerName: string;

    /**
     * Additional configuration for the use case, stored as a JSON object in SSM
     */
    public configuration: UseCaseConfiguration;

    /**
     * The template which should be used to deploy the use case
     */
    public templateName: string;

    /**
     * 8-character sliced UUID (derived from useCaseId) to append to CFN resources
     */
    public shortUUID: string;

    /**
     * 3rd party API key to be used for the use case
     */
    public apiKey?: string;

    /**
     * The ID of the stack that was created. This is used for update and delete stacks.
     */
    _stackId: string;

    // prettier-ignore
    constructor( //NOSONAR - typescript:S107 - data model class hence needs primitive types as parameters
        useCaseId: string,
        name: string,
        description: string | undefined,
        cfnParameters: Map<string, string> | undefined,
        configuration: UseCaseConfiguration,
        userId: string,
        providerName: string,
        useCaseType: string,
        apiKey?: string
    ) {
        this.useCaseId = useCaseId;
        this.name = name;
        this.description = description;
        this.cfnParameters = cfnParameters;
        this.configuration = configuration;
        this.userId = userId;
        this.providerName = providerName
        this.shortUUID = this.useCaseId.substring(0, 8);
        this.templateName = `${providerName}${useCaseType}`;
        this.apiKey = apiKey;
    }

    get stackId(): string {
        return this._stackId;
    }

    set stackId(stackId: string) {
        this._stackId = stackId;
    }

    public getSSMParameterKey(): string | undefined {
        return this.cfnParameters?.get(CfnParameterKeys.ChatConfigSSMParameterName);
    }

    public setSSMParameterKey(ssmParameterKey: string) {
        if (this.cfnParameters === undefined) {
            this.cfnParameters = new Map<string, string>();
        }

        this.cfnParameters.set(CfnParameterKeys.ChatConfigSSMParameterName, ssmParameterKey);
    }

    /**
     * Performs a deep copy of this object, preserving methods and property values
     *
     * @returns a deep copy of the object
     */
    public clone(): UseCase {
        let newUseCase = new UseCase(
            this.useCaseId,
            this.name,
            this.description,
            new Map<string, string>(this.cfnParameters),
            { ...this.configuration },
            this.userId,
            this.templateName
                .split(/(?=[A-Z])/)
                .slice(0, -1)
                .join(''), // provider name
            this.templateName.split(/(?=[A-Z])/).pop()!, // use case type, the last capitalized portion
            this.apiKey
        );

        return newUseCase;
    }

    public requiresAPIKey(): boolean {
        return PROVIDERS_REQUIRING_API_KEY.includes(this.providerName);
    }
}

/**
 * Adapter implementation for @UseCase to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require detailed information about the use case to perform the action,
 * specifically deployments and updates
 */
export class ChatUseCaseDeploymentAdapter extends UseCase {
    constructor(event: APIGatewayEvent) {
        const jsonBody = JSON.parse(event.body!);
        // in update and delete cases, we will be provided a useCaseId. In create, we generate one
        const useCaseId: string = event.pathParameters?.useCaseId ?? crypto.randomUUID();
        const cfnParameters = ChatUseCaseDeploymentAdapter.createCfnParameters(jsonBody, useCaseId);
        const config = ChatUseCaseDeploymentAdapter.createConfiguration(jsonBody);
        const userId = event.requestContext.authorizer!.UserId;

        if (!jsonBody.LlmParams.ModelProvider) {
            const errMsg = `Model Provider name not found in event body. ${JSON.stringify(jsonBody)}}`;
            logger.error(errMsg);
            throw new MissingValueError(errMsg);
        }

        super(
            useCaseId,
            jsonBody?.UseCaseName,
            jsonBody?.UseCaseDescription,
            cfnParameters,
            config,
            userId,
            jsonBody.LlmParams.ModelProvider,
            'Chat',
            jsonBody.LlmParams.ApiKey
        );
    }

    private static createCfnParameters(eventBody: any, useCaseId: string): Map<string, string> {
        const cfnParameters = new Map<string, string>();
        const shortUUID = this.generateShortUUID(useCaseId);
        const ssmParamSuffixUUID = this.generateShortUUID(crypto.randomUUID());

        // Kendra related Params
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingKendraIndexId,
            eventBody.KnowledgeBaseParams?.ExistingKendraIndexId
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.NewKendraIndexName,
            eventBody.KnowledgeBaseParams?.KendraIndexName
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.NewKendraQueryCapacityUnits,
            eventBody.KnowledgeBaseParams?.QueryCapacityUnits
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.NewKendraStorageCapacityUnits,
            eventBody.KnowledgeBaseParams?.StorageCapacityUnits
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.NewKendraIndexEdition,
            eventBody.KnowledgeBaseParams?.KendraIndexEdition
        );
        // in order to set this as a cfnParameter, note the boolean will be converted to a string (e.g. "true")
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.RAGEnabled,
            eventBody.LlmParams?.RAGEnabled
        );

        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.DefaultUserEmail,
            eventBody.DefaultUserEmail
        );

        // VPC related params
        ChatUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.VpcEnabled,
            eventBody.VPCParams?.VpcEnabled
        );

        ChatUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.CreateNewVpc,
            eventBody.VPCParams?.CreateNewVpc
        );

        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingVpcId,
            eventBody.VPCParams?.ExistingVpcId
        );

        ChatUseCaseDeploymentAdapter.setListParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingPrivateSubnetIds,
            eventBody.VPCParams?.ExistingPrivateSubnetIds
        );

        ChatUseCaseDeploymentAdapter.setListParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingSecurityGroupIds,
            eventBody.VPCParams?.ExistingSecurityGroupIds
        );

        // fixed/mandatory parameters for the deployment

        // each new deployment or update requires a new SSM param in order to properly have cloudformation update all resources on a deploy
        cfnParameters.set(
            CfnParameterKeys.ChatConfigSSMParameterName,
            `${process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR]!}/${shortUUID}/${ssmParamSuffixUUID}`
        );
        cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolId, process.env[USER_POOL_ID_ENV_VAR]!);
        cfnParameters.set(
            CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
            process.env[COGNITO_POLICY_TABLE_ENV_VAR]!
        );
        cfnParameters.set(CfnParameterKeys.ExistingModelInfoTableName, process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]!);
        cfnParameters.set(CfnParameterKeys.UseCaseUUID, `${shortUUID}`);

        // only setting the param for API key if it exists
        if (eventBody.LlmParams?.ApiKey) {
            cfnParameters.set(
                CfnParameterKeys.ProviderApiKeySecret,
                `${shortUUID}/${process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR]}`
            );
        }

        // Mapping the bool input from the API payload to the expected format for the CFN parameter
        if (EXTERNAL_PROVIDERS.includes(eventBody.LlmParams.ModelProvider)) {
            ChatUseCaseDeploymentAdapter.setBooleanParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ConsentToDataLeavingAWS,
                eventBody.ConsentToDataLeavingAWS
            );
        }
        return cfnParameters;
    }

    /**
     * If the provided value is defined, sets the correct Cloudformation Parameter to that value as a string.
     *
     * @param cfnParameters The parameter map to set the value in
     * @param paramName Name of the Cloudformation Parameter to set
     * @param value value to set
     */
    private static setParameterIfExists(
        cfnParameters: Map<string, string>,
        paramName: string,
        value: any | undefined
    ): void {
        if (value !== undefined) {
            cfnParameters.set(paramName, value.toString());
        }
    }

    /**
     * If the provided value is defined, sets the correct Cloudformation Parameter to 'Yes' or 'No' accordingly.
     *
     * @param cfnParameters The parameter map to set the value in
     * @param paramName Name of the Cloudformation Parameter to set
     * @param value boolean value to set
     */
    private static setBooleanParameterIfExists(
        cfnParameters: Map<string, string>,
        paramName: string,
        value: boolean | undefined
    ): void {
        if (value !== undefined) {
            if (value) {
                cfnParameters.set(paramName, 'Yes');
            } else {
                cfnParameters.set(paramName, 'No');
            }
        }
    }

    /**
     * If the provided value is defined, sets the correct Cloudformation Parameter to a comma separated list of the values.
     *
     * @param cfnParameters The parameter map to set the value in
     * @param paramName Name of the Cloudformation Parameter to set
     * @param values Array of values to set
     */
    private static setListParameterIfExists(
        cfnParameters: Map<string, string>,
        paramName: string,
        values: Array<any> | undefined
    ): void {
        if (values !== undefined) {
            let valueString = '';
            for (const item of values) {
                valueString += item.toString() + ',';
            }
            // remove trailing comma
            if (valueString.charAt(valueString.length - 1) == ',') {
                valueString = valueString.slice(0, -1);
            }
            cfnParameters.set(paramName, valueString);
        }
    }

    private static createConfiguration(eventBody: any): UseCaseConfiguration {
        return {
            UseCaseName: eventBody.UseCaseName,
            ConversationMemoryType: eventBody.ConversationMemoryType,
            ConversationMemoryParams: eventBody.ConversationMemoryParams,
            KnowledgeBaseType: eventBody.KnowledgeBaseType,
            KnowledgeBaseParams: {
                NumberOfDocs: eventBody.KnowledgeBaseParams?.NumberOfDocs,
                ReturnSourceDocs: eventBody.KnowledgeBaseParams?.ReturnSourceDocs
            },
            LlmParams: {
                ModelProvider: eventBody.LlmParams.ModelProvider,
                ModelId: eventBody.LlmParams.ModelId !== undefined ? eventBody.LlmParams.ModelId : 'default',
                InferenceEndpoint: eventBody.LlmParams.InferenceEndpoint,
                ModelParams: eventBody.LlmParams.ModelParams,
                PromptTemplate: eventBody.LlmParams.PromptTemplate,
                Streaming: eventBody.LlmParams.Streaming,
                Verbose: eventBody.LlmParams.Verbose,
                Temperature: eventBody.LlmParams.Temperature,
                RAGEnabled: eventBody.LlmParams.RAGEnabled,
                ModelInputPayloadSchema: eventBody.LlmParams.ModelInputPayloadSchema,
                ModelOutputJSONPath: eventBody.LlmParams.ModelOutputJSONPath
            },
            IsInternalUser: process.env[IS_INTERNAL_USER_ENV_VAR]! // env var value is set as 'true' or 'false' on deployment of management stack
        };
    }

    private static generateShortUUID(id: string): string {
        return id.substring(0, 8);
    }
}

/**
 * Adapter implementation for @UseCase to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require only the use case ID and user, such as deletion,
 * permanent deletion, and getting info on a single use case
 */
export class ChatUseCaseInfoAdapter extends UseCase {
    constructor(event: APIGatewayEvent) {
        const useCaseId: string = event.pathParameters!.useCaseId!;
        const userId = event.requestContext.authorizer!.UserId;

        super(useCaseId, '', undefined, undefined, {}, userId, '', 'Chat');
    }
}
