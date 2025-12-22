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
    STACK_DEPLOYMENT_SOURCE_AGENTCORE,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    FILES_METADATA_TABLE_NAME_ENV_VAR,
    MULTIMODAL_DATA_BUCKET_ENV_VAR,
    UseCaseTypes,
    SHARED_ECR_CACHE_PREFIX_ENV_VAR
} from '../../utils/constants';
import { WorkflowUseCaseConfiguration } from '../types';
import { generateUUID, parseEventBody } from '../../utils/utils';

/**
 * Adapter implementation for Workflow use cases to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require detailed information about the use case to perform the action,
 * specifically deployments and updates of Workflow use cases.
 */
export class WorkflowUseCaseDeploymentAdapter extends UseCase {
    constructor(event: APIGatewayEvent, apiRootResourceId?: string) {
        const jsonBody = parseEventBody(event);
        if (apiRootResourceId) {
            jsonBody.ExistingApiRootResourceId = apiRootResourceId;
        }
        // in update and delete cases, we will be provided a useCaseId. In create, we generate one
        const useCaseId: string = event.pathParameters?.useCaseId ?? crypto.randomUUID();
        const cfnParameters = WorkflowUseCaseDeploymentAdapter.createCfnParameters(jsonBody, useCaseId);
        const config = WorkflowUseCaseDeploymentAdapter.createConfiguration(jsonBody);
        const userId = event.requestContext.authorizer!.UserId;

        if (!jsonBody.LlmParams?.ModelProvider) {
            const errMsg = 'Model Provider name not found in event body.';
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
            // Workflow usecase generates templates with name Workflow.template.json
            // hence provider is not needed
            undefined,
            UseCaseTypes.WORKFLOW
        );

        // Platform SaaS: capture owning tenant (admin deploys "on behalf of" a customer)
        this.tenantId =
            jsonBody?.TenantId ?? jsonBody?.tenantId ?? (event.requestContext.authorizer as any)?.TenantId ?? undefined;
    }

    /**
     * Override template name generation for Workflow use cases.
     * Workflow use cases use a fixed template name regardless of provider.
     *
     * @param providerName The provider name (ignored for Workflow)
     * @param useCaseType The use case type (ignored for Workflow)
     * @returns Fixed template name 'WorkflowStack'
     */
    protected generateTemplateName(providerName: string | undefined, useCaseType: string): string {
        return 'WorkflowStack';
    }

    /**
     * Override parameter retention for Workflow use cases.
     * Workflow use cases don't need VPC or other parameters to be retained during updates.
     *
     * @returns Empty array - no parameters should be retained for Workflow updates
     */
    public getRetainedParameterKeys(): string[] {
        return [];
    }

    private static getUseInferenceProfileValue(eventBody: any): string {
        // Always check top-level inference profile first
        const topLevelInferenceProfileId = eventBody?.LlmParams?.BedrockLlmParams?.InferenceProfileId;
        if (topLevelInferenceProfileId) {
            return 'Yes';
        }

        // Additional check: if this is a Workflow with agents-as-tools orchestration, also check agents
        if (eventBody?.UseCaseType === 'Workflow' && 
            eventBody?.WorkflowParams?.OrchestrationPattern === 'agents-as-tools') {
            const agents = eventBody?.WorkflowParams?.AgentsAsToolsParams?.Agents || [];
            for (const agent of agents) {
                if (agent?.LlmParams?.BedrockLlmParams?.InferenceProfileId) {
                    return 'Yes';
                }
            }
        }

        return 'No';
    }

    private static createCfnParameters(eventBody: any, useCaseId: string): Map<string, string> {
        const cfnParameters = new Map<string, string>();
        const shortUUID = this.generateShortUUID(useCaseId);
        const recordKeySuffixUUID = this.generateShortUUID(generateUUID());

        WorkflowUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.SharedEcrCachePrefix,
            process.env[SHARED_ECR_CACHE_PREFIX_ENV_VAR]
        );
        
        // Standard use case parameters
        WorkflowUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.DefaultUserEmail,
            eventBody.DefaultUserEmail
        );

        WorkflowUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.DeployUI,
            eventBody.DeployUI
        );

        WorkflowUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.FeedbackEnabled,
            eventBody.FeedbackParams?.FeedbackEnabled
        );

        if (!eventBody.AuthenticationParams?.CognitoParams?.ExistingUserPoolId) {
            WorkflowUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingRestApiId,
                eventBody.ExistingRestApiId
            );

            WorkflowUseCaseDeploymentAdapter.setParameterIfExists(
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
        // AgentCore (Workflow) should provision pull-through cache and use public images by default.
        cfnParameters.set(CfnParameterKeys.StackDeploymentSource, STACK_DEPLOYMENT_SOURCE_AGENTCORE);

        WorkflowUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.UseInferenceProfile,
            this.getUseInferenceProfileValue(eventBody)
        );

        // Set multimodal data parameters from environment variables if multimodal is enabled
        WorkflowUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.MultimodalEnabled,
            eventBody.LlmParams?.MultimodalParams?.MultimodalEnabled
        );

        if (eventBody.LlmParams?.MultimodalParams?.MultimodalEnabled === true) {
            WorkflowUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingMultimodalDataMetadataTable,
                process.env[FILES_METADATA_TABLE_NAME_ENV_VAR]
            );

            WorkflowUseCaseDeploymentAdapter.setParameterIfExists(
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

    private static createConfiguration(eventBody: any): WorkflowUseCaseConfiguration {
        const config: WorkflowUseCaseConfiguration = {
            UseCaseType: eventBody.UseCaseType,
            UseCaseName: eventBody.UseCaseName,
            UseCaseDescription: eventBody.UseCaseDescription,
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
            WorkflowParams: {
                OrchestrationPattern: eventBody.WorkflowParams?.OrchestrationPattern,
                SystemPrompt: eventBody.WorkflowParams?.SystemPrompt,
                AgentsAsToolsParams: eventBody.WorkflowParams?.AgentsAsToolsParams,
                MemoryConfig: eventBody.WorkflowParams?.MemoryConfig
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
 * Adapter implementation for Workflow use cases to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require only the use case ID and user, such as deletion,
 * permanent deletion, and getting info on a single use case
 */
export class WorkflowUseCaseInfoAdapter extends UseCase {
    constructor(event: APIGatewayEvent) {
        const useCaseId: string = event.pathParameters!.useCaseId!;
        const userId = event.requestContext.authorizer!.UserId;

        super(useCaseId, '', undefined, undefined, {}, userId, '', UseCaseTypes.WORKFLOW);
    }
}
