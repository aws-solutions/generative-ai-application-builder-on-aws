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
    CHAT_CONFIG_CFN_PARAMETER_NAME,
    CHAT_PROVIDERS,
    COGNITO_POLICY_TABLE_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    PROVIDERS_REQUIRING_API_KEY,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_API_KEY_SUFFIX_ENV_VAR,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR
} from '../utils/constants';

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
    public configuration: Object;

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
        configuration: Object,
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
        return this.cfnParameters?.get(CHAT_CONFIG_CFN_PARAMETER_NAME);
    }

    public setSSMParameterKey(ssmParameterKey: string) {
        if (this.cfnParameters === undefined) {
            this.cfnParameters = new Map<string, string>();
        }

        this.cfnParameters.set(CHAT_CONFIG_CFN_PARAMETER_NAME, ssmParameterKey);
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
            this.templateName.split(/(?=[A-Z])/)[0], // provider name, split by capital letters
            this.templateName.split(/(?=[A-Z])/)[1], // use case type
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

        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            'ExistingKendraIndexId',
            eventBody.KnowledgeBaseParams?.ExistingKendraIndexId
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            'NewKendraIndexName',
            eventBody.KnowledgeBaseParams?.KendraIndexName
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            'NewKendraQueryCapacityUnits',
            eventBody.KnowledgeBaseParams?.QueryCapacityUnits
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            'NewKendraStorageCapacityUnits',
            eventBody.KnowledgeBaseParams?.StorageCapacityUnits
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            'NewKendraIndexEdition',
            eventBody.KnowledgeBaseParams?.KendraIndexEdition
        );
        // in order to set this as a cfnParameter, note the boolean will be converted to a string (e.g. "true")
        ChatUseCaseDeploymentAdapter.setParameterIfExists(cfnParameters, 'RAGEnabled', eventBody.LlmParams?.RAGEnabled);

        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            'DefaultUserEmail',
            eventBody.DefaultUserEmail
        );

        // fixed/mandatory parameters for the deployment

        // each new deployment or update requires a new SSM param in order to properly have cloudformation update all resources on a deploy
        cfnParameters.set(
            CHAT_CONFIG_CFN_PARAMETER_NAME,
            `${process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR]!}/${shortUUID}/${ssmParamSuffixUUID}`
        );
        cfnParameters.set('ExistingCognitoUserPoolId', process.env[USER_POOL_ID_ENV_VAR]!);
        cfnParameters.set('ExistingCognitoGroupPolicyTableName', process.env[COGNITO_POLICY_TABLE_ENV_VAR]!);
        cfnParameters.set('UseCaseUUID', `${shortUUID}`);

        // only setting the param for API key if it exists
        if (eventBody.LlmParams?.ApiKey !== undefined) {
            cfnParameters.set('ProviderApiKeySecret', `${shortUUID}/${process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR]}`);
        }

        // Mapping the bool input from the API payload to the expected format for the CFN parameter
        if (
            eventBody.ConsentToDataLeavingAWS !== undefined &&
            eventBody.LlmParams.ModelProvider !== CHAT_PROVIDERS.BEDROCK
        ) {
            if (eventBody.ConsentToDataLeavingAWS) {
                cfnParameters.set('ConsentToDataLeavingAWS', 'Yes');
            } else {
                cfnParameters.set('ConsentToDataLeavingAWS', 'No');
            }
        }

        return cfnParameters;
    }

    private static setParameterIfExists(
        cfnParameters: Map<string, string>,
        paramName: string,
        value: any | undefined
    ): void {
        if (value !== undefined) {
            cfnParameters.set(paramName, value.toString());
        }
    }

    private static createConfiguration(eventBody: any): Object {
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
                ModelId: eventBody.LlmParams.ModelId,
                InferenceEndpoint: eventBody.LlmParams.InferenceEndpoint,
                ModelParams: eventBody.LlmParams.ModelParams,
                PromptTemplate: eventBody.LlmParams.PromptTemplate,
                Streaming: eventBody.LlmParams.Streaming,
                Verbose: eventBody.LlmParams.Verbose,
                Temperature: eventBody.LlmParams.Temperature,
                RAGEnabled: eventBody.LlmParams.RAGEnabled
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
