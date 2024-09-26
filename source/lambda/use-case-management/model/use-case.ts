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
    AUTHENTICATION_PROVIDERS,
    CLIENT_ID_ENV_VAR,
    COGNITO_DOMAIN_PREFIX_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    CfnParameterKeys,
    IS_INTERNAL_USER_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_EXISTING_USER_POOL_CLIENT_ENV_VAR
} from '../utils/constants';
import { UseCaseConfiguration } from './types';

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

    private createCfnParametersMapIfNotExists(): void {
        if (this.cfnParameters === undefined) {
            this.cfnParameters = new Map<string, string>();
        }
    }

    get stackId(): string {
        return this._stackId;
    }

    set stackId(stackId: string) {
        this._stackId = stackId;
    }

    public getUseCaseConfigRecordKey() {
        return this.cfnParameters?.get(CfnParameterKeys.UseCaseConfigRecordKey);
    }

    public setUseCaseConfigRecordKey(useCaseConfigRecordKey: string) {
        this.createCfnParametersMapIfNotExists();
        this.cfnParameters!.set(CfnParameterKeys.UseCaseConfigRecordKey, useCaseConfigRecordKey);
    }

    public static generateUseCaseConfigRecordKey(shortUUID: string, recordKeySuffixUUID: string): string {
        return `${shortUUID}-${recordKeySuffixUUID}`;
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
            'Chat'
        );
    }

    private static createCfnParameters(eventBody: any, useCaseId: string): Map<string, string> {
        const cfnParameters = new Map<string, string>();
        const shortUUID = this.generateShortUUID(useCaseId);
        const recordKeySuffixUUID = this.generateShortUUID(crypto.randomUUID());

        // Knowledge base related Params
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.KnowledgeBaseType,
            eventBody.KnowledgeBaseParams?.KnowledgeBaseType
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.BedrockKnowledgeBaseId,
            eventBody.KnowledgeBaseParams?.BedrockKnowledgeBaseParams?.BedrockKnowledgeBaseId
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingKendraIndexId,
            eventBody.KnowledgeBaseParams?.KendraKnowledgeBaseParams?.ExistingKendraIndexId
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.NewKendraIndexName,
            eventBody.KnowledgeBaseParams?.KendraKnowledgeBaseParams?.KendraIndexName
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.NewKendraQueryCapacityUnits,
            eventBody.KnowledgeBaseParams?.KendraKnowledgeBaseParams?.QueryCapacityUnits
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.NewKendraStorageCapacityUnits,
            eventBody.KnowledgeBaseParams?.KendraKnowledgeBaseParams?.StorageCapacityUnits
        );
        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.NewKendraIndexEdition,
            eventBody.KnowledgeBaseParams?.KendraKnowledgeBaseParams?.KendraIndexEdition
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

        ChatUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.DeployUI,
            eventBody.DeployUI
        );

        // VPC related params
        ChatUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.VpcEnabled,
            eventBody.VpcParams?.VpcEnabled
        );

        ChatUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.CreateNewVpc,
            eventBody.VpcParams?.CreateNewVpc
        );

        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingVpcId,
            eventBody.VpcParams?.ExistingVpcId
        );

        ChatUseCaseDeploymentAdapter.setListParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingPrivateSubnetIds,
            eventBody.VpcParams?.ExistingPrivateSubnetIds
        );

        ChatUseCaseDeploymentAdapter.setListParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingSecurityGroupIds,
            eventBody.VpcParams?.ExistingSecurityGroupIds
        );

        // fixed/mandatory parameters for the deployment
        // each new deployment or update requires a new SSM param in order to properly have cloudformation update all resources on a deploy
        cfnParameters.set(
            CfnParameterKeys.UseCaseConfigRecordKey,
            UseCase.generateUseCaseConfigRecordKey(shortUUID, recordKeySuffixUUID)
        );
        cfnParameters.set(CfnParameterKeys.UseCaseConfigTableName, process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]!);

        if (eventBody.AuthenticationParams) {
            switch (eventBody.AuthenticationParams.AuthenticationProvider) {
                case AUTHENTICATION_PROVIDERS.COGNITO:
                    const existingUserPoolId = eventBody.AuthenticationParams.CognitoParams.ExistingUserPoolId;
                    const existingUserPoolClientId = eventBody.AuthenticationParams.CognitoParams.ExistingUserPoolClientId;

                    if (!existingUserPoolId) {
                        throw new Error(`Required field existingUserPoolId not provided for the "Cognito" AuthenticationProvider.`);
                    }

                    cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolId, existingUserPoolId);

                    if (existingUserPoolClientId) {
                        cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolClient, existingUserPoolClientId);
                    }

                    break;
            }
        }
        else {
            cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolId, process.env[USER_POOL_ID_ENV_VAR]!);

            if (
                process.env[USE_EXISTING_USER_POOL_CLIENT_ENV_VAR] &&
                process.env[USE_EXISTING_USER_POOL_CLIENT_ENV_VAR].toLowerCase() === 'true' &&
                process.env[CLIENT_ID_ENV_VAR]
            ) {
                cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolClient, process.env[CLIENT_ID_ENV_VAR]);
            }

            if (process.env[USER_POOL_ID_ENV_VAR]) {
                if (process.env[COGNITO_DOMAIN_PREFIX_VAR]) {
                    cfnParameters.set(CfnParameterKeys.CognitoDomainPrefix, process.env[COGNITO_DOMAIN_PREFIX_VAR]);
                } else {
                    logger.error(
                        'Lambda has an environment variable to use existing user pool, but could not find the environment variable for Cognito domain prefix. This use case setup will have an incorrect sign-in url.'
                    );
                    throw new Error(
                        'Domain prefix not available for existing user pool. Without domain prefix, authenticating into a use case would fail.'
                    );
                }
            }
        }

        cfnParameters.set(
            CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
            process.env[COGNITO_POLICY_TABLE_ENV_VAR]!
        );
        cfnParameters.set(CfnParameterKeys.ExistingModelInfoTableName, process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]!);
        cfnParameters.set(CfnParameterKeys.UseCaseUUID, `${shortUUID}`);

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
        let config = {
            UseCaseName: eventBody.UseCaseName,
            ExistingCognitoUserPoolId: eventBody.ExistingCognitoUserPoolId,
            ConversationMemoryParams: eventBody.ConversationMemoryParams,
            KnowledgeBaseParams: {
                KnowledgeBaseType: eventBody.KnowledgeBaseParams?.KnowledgeBaseType,
                NumberOfDocs: eventBody.KnowledgeBaseParams?.NumberOfDocs,
                ScoreThreshold: eventBody.KnowledgeBaseParams?.ScoreThreshold,
                NoDocsFoundResponse: eventBody.KnowledgeBaseParams?.NoDocsFoundResponse,
                ReturnSourceDocs: eventBody.KnowledgeBaseParams?.ReturnSourceDocs,
                KendraKnowledgeBaseParams: eventBody.KnowledgeBaseParams?.KendraKnowledgeBaseParams,
                BedrockKnowledgeBaseParams: eventBody.KnowledgeBaseParams?.BedrockKnowledgeBaseParams
            },
            LlmParams: {
                ModelProvider: eventBody.LlmParams.ModelProvider,
                BedrockLlmParams: eventBody.LlmParams.BedrockLlmParams,
                SageMakerLlmParams: eventBody.LlmParams.SageMakerLlmParams,
                PromptParams: eventBody.LlmParams.PromptParams,
                ModelParams: eventBody.LlmParams.ModelParams,
                Temperature: eventBody.LlmParams.Temperature,
                MaxInputTextLength: eventBody.LlmParams.MaxInputTextLength,
                RAGEnabled: eventBody.LlmParams.RAGEnabled,
                Streaming: eventBody.LlmParams.Streaming,
                Verbose: eventBody.LlmParams.Verbose
            },
            AuthenticationParams: eventBody.AuthenticationParams,
            IsInternalUser: process.env[IS_INTERNAL_USER_ENV_VAR]! // env var value is set as 'true' or 'false' on deployment of management stack
        };

        // since this is mapped to a json config to be parsed by the chat lambda, replace the string NONE with a null value.
        // we require this functionality to clear a previously set OverrideSearchType on edits.
        if (config.KnowledgeBaseParams?.BedrockKnowledgeBaseParams?.OverrideSearchType == 'NONE') {
            config.KnowledgeBaseParams.BedrockKnowledgeBaseParams.OverrideSearchType = null;
        }

        return config;
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
