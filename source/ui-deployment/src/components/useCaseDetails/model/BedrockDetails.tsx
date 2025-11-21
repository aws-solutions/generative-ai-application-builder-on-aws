// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpaceBetween, StatusIndicator } from '@cloudscape-design/components';
import { ValueWithLabel } from '@/utils';

import { BEDROCK_MODEL_PROVIDER_NAME } from '../../../utils/constants';
import { BaseDetailsContainerProps } from '../types';

/**
 * Renders details about a Bedrock deployment
 *
 * @param {BaseDetailsContainerProps} props - Component props
 * @param {Object} props.selectedDeployment - The selected deployment object containing Bedrock parameters
 * @returns {JSX.Element} Component displaying Bedrock deployment details including model provider,
 *                       model name, inference profile ID, model ARN, and guardrail information
 */
export const BedrockDetails = ({ selectedDeployment }: Partial<BaseDetailsContainerProps>) => {
    if (!selectedDeployment?.LlmParams?.BedrockLlmParams) {
        return <StatusIndicator type="loading">Loading Bedrock details...</StatusIndicator>;
    }

    const bedrockParams = selectedDeployment.LlmParams.BedrockLlmParams;
    const inferenceType = bedrockParams.BedrockInferenceType;

    const inferenceTypeLabels: Record<string, string> = {
        'OTHER_FOUNDATION': 'Foundation Models',
        'INFERENCE_PROFILE': 'Inference Profiles',
        'PROVISIONED': 'Provisioned Models',
        'QUICK_START': 'Foundation Models' // Legacy mapping for backward compatibility
    };

    return (
        <SpaceBetween size="l" data-testid="bedrock-details-container">
            <SpaceBetween size="l">
                <ValueWithLabel label={'Model Provider'}>{BEDROCK_MODEL_PROVIDER_NAME}</ValueWithLabel>

                {inferenceType && (
                    <ValueWithLabel label={'Inference Type'}>
                        {inferenceTypeLabels[inferenceType] || inferenceType}
                    </ValueWithLabel>
                )}

                {/* Model details based on inference type */}
                {/* Legacy QUICK_START deployments */}
                {inferenceType === 'QUICK_START' && bedrockParams.ModelId && (
                    <ValueWithLabel label={'Model Name'}>{bedrockParams.ModelId}</ValueWithLabel>
                )}

                {inferenceType === 'OTHER_FOUNDATION' && bedrockParams.ModelId && (
                    <ValueWithLabel label={'Model ID'}>{bedrockParams.ModelId}</ValueWithLabel>
                )}

                {/* For backward compatibility */}
                {!inferenceType && bedrockParams.ModelId && (
                    <ValueWithLabel label={'Model Name'}>{bedrockParams.ModelId}</ValueWithLabel>
                )}

                {bedrockParams.InferenceProfileId && (
                    <ValueWithLabel label={'Inference Profile ID'}>{bedrockParams.InferenceProfileId}</ValueWithLabel>
                )}

                {bedrockParams.ModelArn && (
                    <ValueWithLabel label={'Model ARN'}>{bedrockParams.ModelArn}</ValueWithLabel>
                )}

                {bedrockParams.GuardrailIdentifier && (
                    <ValueWithLabel label={'Guardrail Identifier'}>{bedrockParams.GuardrailIdentifier}</ValueWithLabel>
                )}

                {bedrockParams.GuardrailVersion && (
                    <ValueWithLabel label={'Guardrail Version'}>{bedrockParams.GuardrailVersion}</ValueWithLabel>
                )}
            </SpaceBetween>
        </SpaceBetween>
    );
};
