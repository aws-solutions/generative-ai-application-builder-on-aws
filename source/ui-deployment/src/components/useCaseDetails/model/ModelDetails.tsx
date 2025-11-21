// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, SpaceBetween, StatusIndicator } from '@cloudscape-design/components';
import { BEDROCK_MODEL_PROVIDER_NAME, SAGEMAKER_MODEL_PROVIDER_NAME, MULTIMODAL_SUPPORTED_USE_CASES } from '../../../utils/constants';
import { BedrockDetails } from './BedrockDetails';
import { SageMakerDetails } from './SageMakerDetails';
import { FormattedModelParams } from './FormattedModelParams';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';
import { BaseDetailsContainerProps } from '../types';
import { getBooleanString } from '@/components/wizard/utils';

/**
 * Renders the model details section of the deployment details view.
 * This component displays information about the selected model deployment including:
 * - Model provider specific details (Bedrock or SageMaker)
 * - Model parameters if they exist
 * - Temperature, Verbose and Streaming settings
 *
 * @param {Partial<BaseDetailsContainerProps>} props - Component props
 * @param {Object} props.selectedDeployment - The currently selected deployment object
 * @returns {JSX.Element} The rendered model details component
 */
export const ModelDetails = ({ selectedDeployment }: Partial<BaseDetailsContainerProps>) => {
    // Handle the case where selectedDeployment or LlmParams is undefined
    if (!selectedDeployment || !selectedDeployment.LlmParams) {
        return <StatusIndicator type="loading">Loading model details...</StatusIndicator>;
    }

    // Get the model provider with a fallback
    const modelProvider = selectedDeployment.LlmParams.ModelProvider || 'unknown';

    // Create a type-safe rendering map
    const providerComponentMap: Record<string, JSX.Element> = {
        [BEDROCK_MODEL_PROVIDER_NAME]: <BedrockDetails selectedDeployment={selectedDeployment} />,
        [SAGEMAKER_MODEL_PROVIDER_NAME]: <SageMakerDetails selectedDeployment={selectedDeployment} />,
        'unknown': <div>Unknown model provider</div>
    };

    // Get the component or fallback to unknown
    const modelComponent = providerComponentMap[modelProvider] || providerComponentMap['unknown'];

    // Extract model parameters if they exist
    const modelParams =
        selectedDeployment.LlmParams.ModelParams && Object.keys(selectedDeployment.LlmParams.ModelParams).length > 0
            ? FormattedModelParams({ modelParams: selectedDeployment.LlmParams.ModelParams })
            : [];

    // Basic model settings
    const basicSettings = (
        <SpaceBetween size="l">
            <ValueWithLabel label={'Temperature'}>{selectedDeployment.LlmParams.Temperature}</ValueWithLabel>
            <ValueWithLabel label={'Verbose'}>{selectedDeployment.LlmParams.Verbose ? 'on' : 'off'}</ValueWithLabel>
            <ValueWithLabel label={'Streaming'}>{selectedDeployment.LlmParams.Streaming ? 'on' : 'off'}</ValueWithLabel>
        </SpaceBetween>
    );

    return (
        <ColumnLayout columns={2} variant="text-grid" data-testid="model-details-tab">
            <SpaceBetween size="l">
                {modelComponent}
                {MULTIMODAL_SUPPORTED_USE_CASES.includes(selectedDeployment.UseCaseType) && (
                    <ValueWithLabel label={'Enable Multimodal Input'}>
                        {getBooleanString(selectedDeployment.LlmParams.MultimodalParams?.MultimodalEnabled)}
                    </ValueWithLabel>
                )}
                {modelParams.length > 0 && (
                    <SpaceBetween size="l" data-testid="model-params-container">
                        {modelParams.slice(0, Math.ceil(modelParams.length / 2))}
                    </SpaceBetween>
                )}
            </SpaceBetween>
            <SpaceBetween size="l">
                {basicSettings}
                {modelParams.length > 0 && (
                    <SpaceBetween size="l">
                        {modelParams.slice(Math.ceil(modelParams.length / 2))}
                    </SpaceBetween>
                )}
            </SpaceBetween>
        </ColumnLayout>
    );
};
