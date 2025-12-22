// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import * as crypto from 'crypto';
import { logger } from '../../power-tools-init';
import {
    AgentProviders,
    AUTHENTICATION_PROVIDERS,
    CfnParameterKeys,
    COGNITO_POLICY_TABLE_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    STACK_DEPLOYMENT_SOURCE_USE_CASE,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    UseCaseTypes,
    USER_POOL_ID_ENV_VAR
} from '../../utils/constants';
import { AgentUseCaseConfiguration } from '../types';
import { UseCase } from '../use-case';
import { generateUUID, parseEventBody } from '../../utils/utils';

export class AgentUseCaseDeploymentAdapter extends UseCase {
    constructor(event: APIGatewayEvent, apiRootResourceId?: string) {
        const jsonBody = parseEventBody(event);
        if (apiRootResourceId) {
            jsonBody.ExistingApiRootResourceId = apiRootResourceId;
        }

        const useCaseId: string = event.pathParameters?.useCaseId ?? crypto.randomUUID();
        const cfnParameters = AgentUseCaseDeploymentAdapter.createCfnParameters(jsonBody, useCaseId);
        const config = AgentUseCaseDeploymentAdapter.createConfiguration(jsonBody);
        const userId = event.requestContext.authorizer!.UserId;

        super(
            useCaseId,
            jsonBody?.UseCaseName,
            jsonBody?.UseCaseDescription,
            cfnParameters,
            config,
            userId,
            AgentProviders.BEDROCK,
            UseCaseTypes.AGENT
        );

        // Platform SaaS: capture owning tenant (admin deploys "on behalf of" a customer)
        this.tenantId =
            jsonBody?.TenantId ?? jsonBody?.tenantId ?? (event.requestContext.authorizer as any)?.TenantId ?? undefined;
    }

    private static createCfnParameters(eventBody: any, useCaseId: string): Map<string, string> {
        const cfnParameters = new Map<string, string>();
        const shortUUID = UseCase.generateShortUUID(useCaseId);
        const recordKeySuffixUUID = UseCase.generateShortUUID(generateUUID());

        AgentUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.DefaultUserEmail,
            eventBody.DefaultUserEmail
        );

        AgentUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.DeployUI,
            eventBody.DeployUI
        );

        AgentUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.BedrockAgentId,
            eventBody.AgentParams?.BedrockAgentParams?.AgentId
        );

        AgentUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.BedrockAgentAliasId,
            eventBody.AgentParams?.BedrockAgentParams?.AgentAliasId
        );

        // VPC related params
        AgentUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.VpcEnabled,
            eventBody.VpcParams?.VpcEnabled
        );

        AgentUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.CreateNewVpc,
            eventBody.VpcParams?.CreateNewVpc
        );

        AgentUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingVpcId,
            eventBody.VpcParams?.ExistingVpcId
        );

        AgentUseCaseDeploymentAdapter.setListParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingPrivateSubnetIds,
            eventBody.VpcParams?.ExistingPrivateSubnetIds
        );

        AgentUseCaseDeploymentAdapter.setListParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ExistingSecurityGroupIds,
            eventBody.VpcParams?.ExistingSecurityGroupIds
        );
        
        AgentUseCaseDeploymentAdapter.setParameterIfExists(
            cfnParameters,
            CfnParameterKeys.ProvisionedConcurrencyValue,
            eventBody.ProvisionedConcurrencyValue
        );
        
        AgentUseCaseDeploymentAdapter.setBooleanParameterIfExists(
            cfnParameters,
            CfnParameterKeys.FeedbackEnabled,
            eventBody.FeedbackParams?.FeedbackEnabled
        );

        if (!eventBody.AuthenticationParams?.CognitoParams?.ExistingUserPoolId) {
            AgentUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingRestApiId,
                eventBody.ExistingRestApiId
            );

            AgentUseCaseDeploymentAdapter.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.ExistingApiRootResourceId,
                eventBody.ExistingApiRootResourceId
            );
        }

        cfnParameters.set(
            CfnParameterKeys.UseCaseConfigRecordKey,
            UseCase.generateUseCaseConfigRecordKey(shortUUID, recordKeySuffixUUID)
        );

        if (eventBody.AuthenticationParams) {
            // prettier-ignore
            switch (eventBody.AuthenticationParams.AuthenticationProvider) { //NOSONAR - typescript:S1301, switch statement used for ease of future extensions
                case AUTHENTICATION_PROVIDERS.COGNITO: {
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
                }
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

        cfnParameters.set(CfnParameterKeys.UseCaseConfigTableName, process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]!);

        cfnParameters.set(
            CfnParameterKeys.ExistingCognitoGroupPolicyTableName,
            process.env[COGNITO_POLICY_TABLE_ENV_VAR]!
        );
        cfnParameters.set(CfnParameterKeys.UseCaseUUID, `${useCaseId}`);
        cfnParameters.set(CfnParameterKeys.StackDeploymentSource, STACK_DEPLOYMENT_SOURCE_USE_CASE);

        return cfnParameters;
    }

    private static createConfiguration(eventBody: any): AgentUseCaseConfiguration {
        const config: AgentUseCaseConfiguration = {
            UseCaseType: eventBody.UseCaseType,
            UseCaseName: eventBody.UseCaseName,
            AgentParams: {
                BedrockAgentParams: {
                    AgentId: eventBody.AgentParams?.BedrockAgentParams?.AgentId,
                    AgentAliasId: eventBody.AgentParams?.BedrockAgentParams?.AgentAliasId,
                    EnableTrace: eventBody.AgentParams?.BedrockAgentParams?.EnableTrace || false
                }
            },
            AuthenticationParams: eventBody.AuthenticationParams,
            IsInternalUser: process.env[IS_INTERNAL_USER_ENV_VAR]!,
            ProvisionedConcurrencyValue: eventBody.ProvisionedConcurrencyValue,
            FeedbackParams: {
                FeedbackEnabled: eventBody.FeedbackParams?.FeedbackEnabled,
                ...(eventBody.FeedbackParams?.FeedbackEnabled && { CustomMappings: {} })
            }
        };

        return config;
    }
}

/**
 * Adapter implementation for @UseCase for Agent use cases
 *
 * Used for operations which require only the use case ID and user, such as deletion,
 * permanent deletion, and getting info on a single use case
 */
export class AgentUseCaseInfoAdapter extends UseCase {
    constructor(event: APIGatewayEvent) {
        const useCaseId: string = event.pathParameters!.useCaseId!;
        const userId = event.requestContext.authorizer!.UserId;

        super(useCaseId, '', undefined, undefined, {}, userId, '', UseCaseTypes.AGENT);
    }
}
