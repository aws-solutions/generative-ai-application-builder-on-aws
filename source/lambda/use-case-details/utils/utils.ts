// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { APIGatewayProxyEvent } from 'aws-lambda';
import { RETRY_CONFIG, DetailsResponse } from './constants';

export interface RetrySettings {
    maxRetries: number;
    backOffRate: number;
    initialDelayMs: number;
}

export function getRetrySettings(): RetrySettings {
    return {
        maxRetries: RETRY_CONFIG.maxRetries,
        backOffRate: RETRY_CONFIG.backOffRate,
        initialDelayMs: RETRY_CONFIG.initialDelayMs
    };
}

export const validateAndParseRequest = (event: APIGatewayProxyEvent): string => {
    const useCaseConfigKey = event.pathParameters?.useCaseConfigKey;

    if (!useCaseConfigKey) {
        throw new Error('UseCaseConfigKey is missing');
    }

    return useCaseConfigKey;
};

export function castToResponse(params: any): DetailsResponse {
    let useCaseDetails: DetailsResponse = {
        UseCaseName: params.UseCaseName ?? params.Name,
        UseCaseType: params.UseCaseType as string,
        LlmParams: params.LlmParams,
        ModelProviderName: params.LlmParams?.ModelProvider ?? 'BedrockAgent',
        FeedbackParams: params.FeedbackParams
    };

    let cleanedLlmParams: any = {};
    if (useCaseDetails.LlmParams) {

        if (useCaseDetails.LlmParams.PromptParams) {
            const { PromptParams } = useCaseDetails.LlmParams;
            cleanedLlmParams.PromptParams = {
                UserPromptEditingEnabled: PromptParams.UserPromptEditingEnabled ?? undefined,
                MaxInputTextLength: PromptParams.MaxInputTextLength ?? undefined,
                ...(PromptParams.UserPromptEditingEnabled && {
                    PromptTemplate: PromptParams.PromptTemplate ?? undefined,
                    MaxPromptTemplateLength: PromptParams.MaxPromptTemplateLength ?? undefined
                })
            };
        }

        if ('RAGEnabled' in useCaseDetails.LlmParams) {
            cleanedLlmParams.RAGEnabled = useCaseDetails.LlmParams.RAGEnabled;
        }

        if ('MultimodalParams' in useCaseDetails.LlmParams) {
            cleanedLlmParams.MultimodalParams = useCaseDetails.LlmParams.MultimodalParams;
        }
    }
    
    useCaseDetails.LlmParams = Object.keys(cleanedLlmParams).length > 0 ? cleanedLlmParams : undefined;

    return useCaseDetails;
}

export function delay(delayMillis: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, delayMillis);
    });
}
