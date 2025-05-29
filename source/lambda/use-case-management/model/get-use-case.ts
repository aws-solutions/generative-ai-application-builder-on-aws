// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import {
    AgentUseCaseConfiguration,
    UseCaseConfiguration,
    GetUseCaseDetailsAdminResponse,
    GetUseCaseDetailsUserResponse
} from './types';
import { UseCaseRecord } from './list-use-cases';
import { UseCaseStackDetails } from '../cfn/stack-management';
import RequestValidationError from '../utils/error';
import { TokenVerifier } from '../utils/cognito_jwt_verifier';

export type CombinedUseCaseParams = UseCaseRecord &
    Partial<UseCaseStackDetails> &
    Partial<UseCaseConfiguration> &
    Partial<AgentUseCaseConfiguration>;

export async function validateAdminToken(token: string): Promise<boolean> {
    try {
        const verifier = new TokenVerifier(process.env.USER_POOL_ID as string, process.env.CLIENT_ID as string);
        const tokenInfo = await verifier.verifyToken(token);
        const groups = tokenInfo['cognito:groups'];
        if (!groups || !Array.isArray(groups)) {
            console.error('No valid groups found in token');
            return false;
        }

        return groups.includes('admin');
    } catch (error) {
        console.error('User is not an admin: ', error);
        return false;
    }
}

/**
 * Method for casting the data from the UseCaseRecord, UseCaseStackDetails, and UseCaseConfig
 * to the admin response interface.
 *
 * @param CombinedUseCaseParams
 */
export function castToAdminType(params: CombinedUseCaseParams): GetUseCaseDetailsAdminResponse {
    const useCaseInfo: GetUseCaseDetailsAdminResponse = {
        UseCaseId: params.UseCaseId,
        CreatedDate: params.CreatedDate,
        Description: params.Description ?? '',
        StackId: params.StackId,
        Status: params.status ?? '',
        ragEnabled: params.ragEnabled ?? 'false',
        deployUI: params.deployUI as string,
        createNewVpc: params.createNewVpc as string,
        vpcEnabled: params.vpcEnabled as string,
        vpcId: params.vpcId,
        UseCaseType: params.UseCaseType as string,
        UseCaseName: params.UseCaseName ?? params.Name,
        cloudwatchDashboardUrl: params.cloudwatchDashboardUrl,
        cloudFrontWebUrl: params.cloudFrontWebUrl,
        knowledgeBaseType: params.knowledgeBaseType,
        kendraIndexId: params.kendraIndexId,
        privateSubnetIds: params.privateSubnetIds,
        securityGroupIds: params.securityGroupIds,
        ConversationMemoryParams: params.ConversationMemoryParams,
        LlmParams: params.LlmParams,
        KnowledgeBaseParams: params.KnowledgeBaseParams,
        AgentParams: params.AgentParams,
        AuthenticationParams: params.AuthenticationParams,
        defaultUserEmail: params.defaultUserEmail,
        FeedbackParams: params.FeedbackParams
    };

    return useCaseInfo;
}

export function castToBusinessUserType(params: CombinedUseCaseParams): GetUseCaseDetailsUserResponse {
    let useCaseInfo: GetUseCaseDetailsUserResponse = {
        UseCaseName: params.UseCaseName ?? params.Name,
        UseCaseType: params.UseCaseType as string,
        LlmParams: params.LlmParams,
        ModelProviderName: params.LlmParams?.ModelProvider ?? 'BedrockAgent'
    };

    if (useCaseInfo.LlmParams) {
        let cleanedLlmParams: any = {};

        if (useCaseInfo.LlmParams.PromptParams) {
            const { PromptParams } = useCaseInfo.LlmParams;
            cleanedLlmParams.PromptParams = {
                UserPromptEditingEnabled: PromptParams.UserPromptEditingEnabled ?? undefined,
                MaxInputTextLength: PromptParams.MaxInputTextLength ?? undefined,
                ...(PromptParams.UserPromptEditingEnabled && {
                    PromptTemplate: PromptParams.PromptTemplate ?? undefined,
                    MaxPromptTemplateLength: PromptParams.MaxPromptTemplateLength ?? undefined
                })
            };
        }

        if ('RAGEnabled' in useCaseInfo.LlmParams) {
            cleanedLlmParams.RAGEnabled = useCaseInfo.LlmParams.RAGEnabled;
        }

        useCaseInfo.LlmParams = Object.keys(cleanedLlmParams).length > 0 ? cleanedLlmParams : undefined;
    }

    return useCaseInfo;
}

/**
 * Create event adapter from the API Gateway event for the GET request.
 */
export class GetUseCaseAdapter {
    event: APIGatewayEvent;
    useCaseId: string;
    authToken: string;

    constructor(event: APIGatewayEvent) {
        this.event = event;

        if (!event.pathParameters?.useCaseId) {
            throw new RequestValidationError('UseCaseId was not found in the request');
        }
        const useCaseId: string = event.pathParameters.useCaseId;
        this.useCaseId = useCaseId;

        if (!event.headers?.Authorization) {
            throw new RequestValidationError('Authorization header was not found in the request');
        }

        this.authToken = event.headers.Authorization;
    }
}
