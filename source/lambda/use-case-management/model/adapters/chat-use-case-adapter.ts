// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import * as crypto from 'crypto';
import { MissingValueError } from '../../exception/missing-value-error';
import { logger } from '../../power-tools-init';
import { UseCase } from '../use-case';
import {
    AUTHENTICATION_PROVIDERS,
    COGNITO_POLICY_TABLE_ENV_VAR,
    CfnParameterKeys,
    IS_INTERNAL_USER_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    STACK_DEPLOYMENT_SOURCE_USE_CASE,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    UseCaseTypes
} from '../../utils/constants';
import { UseCaseConfiguration } from '../types';
import { generateUUID, parseEventBody } from '../../utils/utils';

/**
 * Adapter implementation for @UseCase to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require detailed information about the use case to perform the action,
 * specifically deployments and updates
 */
export class ChatUseCaseDeploymentAdapter extends UseCase {
    constructor(event: APIGatewayEvent, apiRootResourceId?: string) {
        const jsonBody = parseEventBody(event);
        if (apiRootResourceId) {
            jsonBody.ExistingApiRootResourceId = apiRootResourceId;
        }
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
            UseCaseTypes.CHAT
        );

        // Platform SaaS: capture owning tenant (admin deploys "on behalf of" a customer)
        this.tenantId =
            jsonBody?.TenantId ?? jsonBody?.tenantId ?? (event.requestContext.authorizer as any)?.TenantId ?? undefined;
    }

    private static createCfnParameters(eventBody: any, useCaseId: string): Map<string, string> {
        const cfnParameters = new Map<string, string>();
        const shortUUID = this.generateShortUUID(useCaseId);
        const recordKeySuffixUUID = this.generateShortUUID(generateUUID());

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

        ChatUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.UseInferenceProfile,
            eventBody.LlmParams?.BedrockLlmParams?.InferenceProfileId
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

        ChatUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.FeedbackEnabled,
            eventBody.FeedbackParams?.FeedbackEnabled
        );

        ChatUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ProvisionedConcurrencyValue,
            eventBody.ProvisionedConcurrencyValue
        );

        if (!eventBody.AuthenticationParams?.CognitoParams?.ExistingUserPoolId) {
            ChatUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingRestApiId,
                eventBody.ExistingRestApiId
            );

            ChatUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingApiRootResourceId,
                eventBody.ExistingApiRootResourceId
            );
        }

        // fixed/mandatory parameters for the deployment
        // each new deployment or update requires a new SSM param in order to properly have cloudformation update all resources on a deploy
        cfnParameters.set(
            CfnParameterKeys.UseCaseConfigRecordKey,
            UseCase.generateUseCaseConfigRecordKey(shortUUID, recordKeySuffixUUID)
        );
        cfnParameters.set(CfnParameterKeys.UseCaseConfigTableName, process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]!);

        // prettier-ignore
        if (eventBody.AuthenticationParams) {
            switch ( //NOSONAR - typescript:S1301, switch statement used for ease of future extensions
                eventBody.AuthenticationParams.AuthenticationProvider
            ) {
                case AUTHENTICATION_PROVIDERS.COGNITO:
                    const existingUserPoolId = eventBody.AuthenticationParams.CognitoParams.ExistingUserPoolId;
                    const existingUserPoolClientId =
                        eventBody.AuthenticationParams.CognitoParams.ExistingUserPoolClientId;

                    if (!existingUserPoolId) {
                        throw new Error(
                            'Required field existingUserPoolId not provided for the "Cognito" AuthenticationProvider.'
                        );
                    }

                    cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolId, existingUserPoolId);

                    if (existingUserPoolClientId) {
                        cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolClient, existingUserPoolClientId);
                    }

                    break;
                default:
                    logger.error(
                        `Error: unsupported AuthenticationProvider. AuthenticationParams provided: ${eventBody.AuthenticationParams}`
                    );
                    throw new Error(
                        `Error: unsupported AuthenticationProvider: ${eventBody.AuthenticationParams.AuthenticationProvider}.`
                    );
            }
        } else {
            cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolId, process.env[USER_POOL_ID_ENV_VAR]!);
        }

        cfnParameters.set(
            CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
            process.env[COGNITO_POLICY_TABLE_ENV_VAR]!
        );
        cfnParameters.set(CfnParameterKeys.ExistingModelInfoTableName, process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]!);
        cfnParameters.set(CfnParameterKeys.UseCaseUUID, `${useCaseId}`);
        cfnParameters.set(CfnParameterKeys.StackDeploymentSource, STACK_DEPLOYMENT_SOURCE_USE_CASE);

        return cfnParameters;
    }

    private static createConfiguration(eventBody: any): UseCaseConfiguration {
        let config = {
            UseCaseType: eventBody.UseCaseType,
            UseCaseName: eventBody.UseCaseName,
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
            ProvisionedConcurrencyValue: eventBody.ProvisionedConcurrencyValue,
            FeedbackParams: {
                FeedbackEnabled: eventBody.FeedbackParams?.FeedbackEnabled,
                ...(eventBody.FeedbackParams?.FeedbackEnabled && { CustomMappings: {} })
            },
            IsInternalUser: process.env[IS_INTERNAL_USER_ENV_VAR]! // env var value is set as 'true' or 'false' on deployment of management stack
        };

        // since this is mapped to a json config to be parsed by the chat lambda, replace the string NONE with a null value.
        // we require this functionality to clear a previously set OverrideSearchType on edits.
        if (config.KnowledgeBaseParams?.BedrockKnowledgeBaseParams?.OverrideSearchType == 'NONE') {
            config.KnowledgeBaseParams.BedrockKnowledgeBaseParams.OverrideSearchType = null;
        }

        return config;
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

        super(useCaseId, '', undefined, undefined, {}, userId, '', UseCaseTypes.CHAT);
    }
}
