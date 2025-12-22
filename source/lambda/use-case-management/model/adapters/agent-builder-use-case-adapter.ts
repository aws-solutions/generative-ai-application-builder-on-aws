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
    FILES_METADATA_TABLE_NAME_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    MULTIMODAL_DATA_BUCKET_ENV_VAR,
    SHARED_ECR_CACHE_PREFIX_ENV_VAR,
    STACK_DEPLOYMENT_SOURCE_AGENTCORE,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    UseCaseTypes
} from '../../utils/constants';
import { AgentBuilderUseCaseConfiguration } from '../types';
import { generateUUID, parseEventBody } from '../../utils/utils';

/**
 * Adapter implementation for Agent Builder use cases to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require detailed information about the use case to perform the action,
 * specifically deployments and updates of Agent Builder use cases.
 *
 * IMPORTANT: Amazon Bedrock AgentCore (preview service) does not support VPC deployments.
 * All Agent Builder components run in non-VPC mode regardless of any VPC configuration provided.
 */
export class AgentBuilderUseCaseDeploymentAdapter extends UseCase {
    constructor(event: APIGatewayEvent, apiRootResourceId?: string) {
        const jsonBody = parseEventBody(event);
        if (apiRootResourceId) {
            jsonBody.ExistingApiRootResourceId = apiRootResourceId;
        }
        // in update and delete cases, we will be provided a useCaseId. In create, we generate one
        const useCaseId: string = event.pathParameters?.useCaseId ?? crypto.randomUUID();
        const cfnParameters = AgentBuilderUseCaseDeploymentAdapter.createCfnParameters(jsonBody, useCaseId);
        const config = AgentBuilderUseCaseDeploymentAdapter.createConfiguration(jsonBody);
        const userId = event.requestContext.authorizer!.UserId;

        if (!jsonBody.LlmParams?.ModelProvider) {
            const errMsg = `Model Provider name not found in event body. ${JSON.stringify(jsonBody)}`;
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
            // AgentBuilder usecase generates templates with name AgentBuilder.template.json
            // hence provider is not needed
            undefined,
            UseCaseTypes.AGENT_BUILDER
        );

        // Platform SaaS: capture owning tenant (admin deploys "on behalf of" a customer)
        this.tenantId =
            jsonBody?.TenantId ?? jsonBody?.tenantId ?? (event.requestContext.authorizer as any)?.TenantId ?? undefined;
    }

    /**
     * Override template name generation for Agent Builder use cases.
     * Agent Builder use cases use a fixed template name regardless of provider.
     *
     * @param providerName The provider name (ignored for Agent Builder)
     * @param useCaseType The use case type (ignored for Agent Builder)
     * @returns Fixed template name 'AgentBuilderStack'
     */
    protected generateTemplateName(providerName: string | undefined, useCaseType: string): string {
        return 'AgentBuilderStack';
    }

    /**
     * Override parameter retention for MCP use cases.
     * MCP Server use cases don't need VPC or other parameters to be retained during updates.
     *
     * @returns Empty array - no parameters should be retained for MCP updates
     */
    public getRetainedParameterKeys(): string[] {
        return [];
    }

    private static getUseInferenceProfileValue(eventBody: any): string {
        const bedrockInferenceType = eventBody?.LlmParams?.BedrockLlmParams?.BedrockInferenceType;
        return bedrockInferenceType === 'INFERENCE_PROFILE' ? 'Yes' : 'No';
    }

    private static createCfnParameters(eventBody: any, useCaseId: string): Map<string, string> {
        const cfnParameters = new Map<string, string>();
        const shortUUID = this.generateShortUUID(useCaseId);
        const recordKeySuffixUUID = this.generateShortUUID(generateUUID());

        // Agent Builder specific parameters
        AgentBuilderUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.EnableLongTermMemory,
            eventBody.AgentParams?.MemoryConfig?.LongTermEnabled
        );

        AgentBuilderUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.SharedEcrCachePrefix,
            process.env[SHARED_ECR_CACHE_PREFIX_ENV_VAR]
        );

        // Standard use case parameters
        AgentBuilderUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.DefaultUserEmail,
            eventBody.DefaultUserEmail
        );

        AgentBuilderUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.DeployUI,
            eventBody.DeployUI
        );

        // Note: Agent Builder does not support VPC deployments
        // VPC parameters are intentionally omitted

        AgentBuilderUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.FeedbackEnabled,
            eventBody.FeedbackParams?.FeedbackEnabled
        );

        if (!eventBody.AuthenticationParams?.CognitoParams?.ExistingUserPoolId) {
            AgentBuilderUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingRestApiId,
                eventBody.ExistingRestApiId
            );

            AgentBuilderUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingApiRootResourceId,
                eventBody.ExistingApiRootResourceId
            );
        }

        // fixed/mandatory parameters for the deployment
        // each new deployment or update requires a new DDB record key in order to properly have cloudformation update all resources on a deploy
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
                    cfnParameters.set(CfnParameterKeys.ComponentCognitoUserPoolId, existingUserPoolId)
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
            cfnParameters.set(CfnParameterKeys.ComponentCognitoUserPoolId, process.env[USER_POOL_ID_ENV_VAR]!)
        }

        cfnParameters.set(
            CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
            process.env[COGNITO_POLICY_TABLE_ENV_VAR]!
        );
        cfnParameters.set(CfnParameterKeys.UseCaseUUID, `${useCaseId}`);
        // AgentCore (AgentBuilder) should provision pull-through cache and use public images by default.
        cfnParameters.set(CfnParameterKeys.StackDeploymentSource, STACK_DEPLOYMENT_SOURCE_AGENTCORE);

        AgentBuilderUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.UseInferenceProfile,
            this.getUseInferenceProfileValue(eventBody)
        );

        // Set multimodal data parameters from environment variables if multimodal is enabled
        AgentBuilderUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.MultimodalEnabled,
            eventBody.LlmParams?.MultimodalParams?.MultimodalEnabled
        );

        if (eventBody.LlmParams?.MultimodalParams?.MultimodalEnabled === true) {
            AgentBuilderUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingMultimodalDataMetadataTable,
                process.env[FILES_METADATA_TABLE_NAME_ENV_VAR]
            );

            AgentBuilderUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingMultimodalDataBucket,
                process.env[MULTIMODAL_DATA_BUCKET_ENV_VAR]
            );
        } else if (eventBody.LlmParams?.MultimodalParams?.MultimodalEnabled === false) {
            cfnParameters.set(CfnParameterKeys.ExistingMultimodalDataMetadataTable, '');
            cfnParameters.set(CfnParameterKeys.ExistingMultimodalDataBucket, '');
        }

        return cfnParameters;
    }

    private static createConfiguration(eventBody: any): AgentBuilderUseCaseConfiguration {
        const config: AgentBuilderUseCaseConfiguration = {
            UseCaseType: eventBody.UseCaseType,
            UseCaseName: eventBody.UseCaseName,
            LlmParams: {
                ModelProvider: eventBody.LlmParams?.ModelProvider,
                BedrockLlmParams: eventBody.LlmParams?.BedrockLlmParams,
                SageMakerLlmParams: eventBody.LlmParams?.SageMakerLlmParams,
                PromptParams: eventBody.LlmParams?.PromptParams,
                ModelParams: eventBody.LlmParams?.ModelParams,
                Temperature: eventBody.LlmParams?.Temperature,
                RAGEnabled: eventBody.LlmParams?.RAGEnabled,
                Streaming: eventBody.LlmParams?.Streaming,
                Verbose: eventBody.LlmParams?.Verbose,
                MultimodalParams: eventBody.LlmParams?.MultimodalParams
            },
            AgentBuilderParams: {
                SystemPrompt: eventBody.AgentParams?.SystemPrompt,
                MCPServers: eventBody.AgentParams?.MCPServers,
                Tools: eventBody.AgentParams?.Tools,
                MemoryConfig: eventBody.AgentParams?.MemoryConfig
            },
            AuthenticationParams: eventBody.AuthenticationParams,
            FeedbackParams: {
                FeedbackEnabled: eventBody.FeedbackParams?.FeedbackEnabled,
                ...(eventBody.FeedbackParams?.FeedbackEnabled && { CustomMappings: {} })
            },
            IsInternalUser: process.env[IS_INTERNAL_USER_ENV_VAR]! // env var value is set as 'true' or 'false' on deployment of management stack
        };

        return config;
    }
}

/**
 * Adapter implementation for Agent Builder use cases to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require only the use case ID and user, such as deletion,
 * permanent deletion, and getting info on a single use case
 */
export class AgentBuilderUseCaseInfoAdapter extends UseCase {
    constructor(event: APIGatewayEvent) {
        const useCaseId: string = event.pathParameters!.useCaseId!;
        const userId = event.requestContext.authorizer!.UserId;

        super(useCaseId, '', undefined, undefined, {}, userId, '', UseCaseTypes.AGENT_BUILDER);
    }
}
