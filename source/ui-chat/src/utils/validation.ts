// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MAX_PROMPT_TEMPLATE_LENGTH, MODEL_PROVIDER } from './constants';

export interface ValidatePromptTemplateParams {
    promptTemplate: string;
    isRagEnabled: boolean;
    maxPromptTemplateLength?: number;
    modelProvider?: string;
}

export const validatePromptTemplate = (
    params: ValidatePromptTemplateParams
): { isValid: boolean; error: string } => {
    const { 
        promptTemplate, 
        isRagEnabled, 
        maxPromptTemplateLength = MAX_PROMPT_TEMPLATE_LENGTH, 
        modelProvider 
    } = params;
    
    // Define required placeholders based on model provider and RAG status
    let requiredPlaceholders: string[] = [];
    let deprecatedPlaceholders: string[] = [];

    // Handle different model providers
    if (modelProvider === MODEL_PROVIDER.SAGEMAKER) {
        // For SageMaker, both input and history are required in non-RAG mode
        if (isRagEnabled) {
            requiredPlaceholders = ['{context}', '{input}', '{history}'];
        } else {
            requiredPlaceholders = ['{input}', '{history}'];
        }
        deprecatedPlaceholders = []; // No deprecated placeholders for SageMaker
    } else {
        // For other providers, {context} is required for RAG, and {input}/{history} are deprecated
        requiredPlaceholders = isRagEnabled ? ['{context}'] : [];
        deprecatedPlaceholders = ['{history}', '{input}'];
    }

    // Check if prompt template is empty
    if (!promptTemplate) {
        return {
            isValid: false,
            error: 'Enter a valid prompt template'
        };
    }

    // Check length constraints
    if (promptTemplate.length > maxPromptTemplateLength) {
        return {
            isValid: false,
            error: `The prompt template has too many characters. Character count: ${promptTemplate.length}/${maxPromptTemplateLength}`
        };
    }

    // Check required placeholders
    for (const placeholder of requiredPlaceholders) {
        const count = (promptTemplate.match(new RegExp(placeholder, 'g')) || []).length;

        if (count === 0) {
            return {
                isValid: false,
                error: `The prompt template must contain the placeholder: ${placeholder}`
            };
        }

        if (count > 1) {
            return {
                isValid: false,
                error: `The placeholder ${placeholder} should appear only once in the prompt template.`
            };
        }
    }

    // Check deprecated placeholders (only applies to non-SageMaker providers)
    for (const deprecatedPlaceholder of deprecatedPlaceholders) {
        const count = (promptTemplate.match(new RegExp(deprecatedPlaceholder, 'g')) || []).length;

        if (count > 0 && deprecatedPlaceholder === '{history}') {
            return {
                isValid: false,
                error: `Please remove the {history} tags. The {history} placeholder is no longer used and message history will now be automatically added after the system prompt and before the latest user input.`
            };
        } else if (count > 0 && deprecatedPlaceholder === '{input}') {
            return {
                isValid: false,
                error: `Please remove the {input} tags. The {input} placeholder is no longer used and will now be automatically added as the last message in the prompt.`
            };
        } else if (count > 0) {
            return {
                isValid: false,
                error: `The prompt template contains deprecated placeholder: ${deprecatedPlaceholder}. Please remove to use this prompt template.`
            };
        }
    }

    return { isValid: true, error: '' };
};

export interface TraceDetails {
    rootId: string;
    parentId: string;
    sampled: boolean;
    lineage: string;
    message: string;
}

export const parseTraceId = (errorMessage: string): TraceDetails => {
    try {
        // Extract the trace ID portion from the error message
        const traceStart = errorMessage.indexOf('Root=');
        if (traceStart === -1) {
            throw new Error('No trace ID found in message');
        }

        const message = traceStart > 0 ? errorMessage.slice(0, traceStart).trim() : '';

        const traceId = errorMessage.slice(traceStart);

        // Split the trace ID into components and create a map
        const components = traceId.split(';').reduce((acc: Record<string, string>, curr: string) => {
            const [key, value] = curr.split('=');
            acc[key] = value;
            return acc;
        }, {});

        return {
            rootId: components['Root'] || '',
            parentId: components['Parent'] || '',
            sampled: components['Sampled'] === '1',
            lineage: components['Lineage'] || '',
            message: message
        };
    } catch (error) {
        throw new Error(`Failed to parse trace ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const formatCharacterCount = (count: number): string => {
    if (count >= 1000) {
        return `${(count / 1000).toLocaleString()}k`;
    }
    return count.toLocaleString();
};