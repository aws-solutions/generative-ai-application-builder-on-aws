// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Auth } from 'aws-amplify';

export interface TransformedDeployment {
    useCaseUUID: string;
    defaultUserEmail: string;
    IsInternalUser?: string;
    createNewVpc: string;
    UseCaseId?: string;
    CreatedDate?: string;
    StackId?: string;
    status?: string;
    UseCaseType?: string;
    UseCaseName?: string;
    Name?: string;
    Description?: string;
    ragEnabled?: string;
    deployUI?: string;
    vpcEnabled?: string;
    vpcId?: string;
    cloudwatchDashboardUrl?: string;
    cloudFrontWebUrl?: string;
    knowledgeBaseType?: string;
    kendraIndexId?: string;
    bedrockKnowledgeBaseId?: string;
    privateSubnetIds?: string[];
    securityGroupIds?: string[];
    KnowledgeBaseParams?: any;
    ConversationMemoryParams?: any;
    LlmParams?: any;
    FeedbackParams?: any;
    AuthenticationParams?: any;
    AgentParams?: any;
    [key: string]: any; // Allow for additional properties
}

/**
 * Use currently authenticated user to generate a JWT token from
 * Cognito.
 * @returns JWT Token
 */
export async function generateToken() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const token = user.getSignInUserSession().getAccessToken().getJwtToken();
        return token;
    } catch (error) {
        console.error('error REST API:', error);
    }
}

// Copy properties from API response, preserving structure
export const copyIfDefined = (source: any, target: any, sourceKey: string, targetKey?: string) => {
    if (source[sourceKey] !== undefined) {
        target[targetKey || sourceKey] = source[sourceKey];
    }
};

/**
 * Transforms the API response format to match the existing selectedDeployment format
 * preserving the original structure without adding undefined attributes
 * @param apiResponse The response from the getUseCaseDetails API
 * @returns An object matching the format of the existing selectedDeployment
 */
export const mapApiResponseToSelectedDeployment = (apiResponse: any): TransformedDeployment | null => {
    if (!apiResponse) {
        return null;
    }

    // Extract the UUID from the UseCaseId
    const useCaseUUID = apiResponse.UseCaseId ? apiResponse.UseCaseId.substring(0, 8) : '';

    // Create base object with required wizard fields
    const transformedDeployment: TransformedDeployment = {
        useCaseUUID,
        defaultUserEmail: 'placeholder@example.com',
        createNewVpc: 'No'
    };

    // Copy all fields from the API response
    const fields = [
        'UseCaseId',
        'CreatedDate',
        'StackId',
        'UseCaseType',
        'Description',
        'ragEnabled',
        'deployUI',
        'vpcEnabled',
        'vpcId',
        'cloudwatchDashboardUrl',
        'cloudFrontWebUrl',
        'knowledgeBaseType',
        'kendraIndexId',
        'bedrockKnowledgeBaseId',
        'privateSubnetIds',
        'securityGroupIds',
        'KnowledgeBaseParams',
        'ConversationMemoryParams',
        'LlmParams',
        'FeedbackParams',
        'AuthenticationParams',
        'AgentParams'
    ];

    fields.forEach((field) => copyIfDefined(apiResponse, transformedDeployment, field));

    // Special case for Status -> status
    copyIfDefined(apiResponse, transformedDeployment, 'Status', 'status');

    // Special case for UseCaseName -> both UseCaseName and Name
    if (apiResponse.UseCaseName !== undefined) {
        transformedDeployment.UseCaseName = apiResponse.UseCaseName;
        transformedDeployment.Name = apiResponse.UseCaseName;
    }

    // Special case for Bedrock knowledge base ID from nested structure
    if (
        apiResponse.bedrockKnowledgeBaseId === undefined &&
        apiResponse.KnowledgeBaseParams?.BedrockKnowledgeBaseParams?.BedrockKnowledgeBaseId !== undefined
    ) {
        transformedDeployment.bedrockKnowledgeBaseId =
            apiResponse.KnowledgeBaseParams.BedrockKnowledgeBaseParams.BedrockKnowledgeBaseId;
    }

    return transformedDeployment;
};
