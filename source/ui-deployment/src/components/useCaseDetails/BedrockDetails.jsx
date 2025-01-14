// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext } from 'react';
import { SpaceBetween } from '@cloudscape-design/components';
import { ValueWithLabel } from './common-components';
import HomeContext from '../../contexts/home.context';

import { BEDROCK_MODEL_PROVIDER_NAME } from '../../utils/constants';

export const BedrockDetails = () => {
    const {
        state: { selectedDeployment }
    } = useContext(HomeContext);

    return (
        <SpaceBetween size="l" data-testid="bedrock-details-container">
            {
                <SpaceBetween size="l">
                    <ValueWithLabel label={'Model Provider'}>{BEDROCK_MODEL_PROVIDER_NAME}</ValueWithLabel>
                    {selectedDeployment.LlmParams.BedrockLlmParams.ModelId && (
                        <ValueWithLabel label={'Model Name'}>
                            {selectedDeployment.LlmParams.BedrockLlmParams.ModelId}
                        </ValueWithLabel>
                    )}
                    {selectedDeployment.LlmParams.BedrockLlmParams.InferenceProfileId && (
                        <ValueWithLabel label={'Inference Profile ID'}>
                            {selectedDeployment.LlmParams.BedrockLlmParams.InferenceProfileId}
                        </ValueWithLabel>
                    )}
                    {selectedDeployment.LlmParams.BedrockLlmParams.ModelArn && (
                        <ValueWithLabel label={'Model ARN'}>
                            {selectedDeployment.LlmParams.BedrockLlmParams.ModelArn}
                        </ValueWithLabel>
                    )}
                    {selectedDeployment.LlmParams.BedrockLlmParams.GuardrailIdentifier && (
                        <ValueWithLabel label={'Guardrail Identifier'}>
                            {selectedDeployment.LlmParams.BedrockLlmParams.GuardrailIdentifier}
                        </ValueWithLabel>
                    )}
                    {selectedDeployment.LlmParams.BedrockLlmParams.GuardrailVersion && (
                        <ValueWithLabel label={'Guardrail Version'}>
                            {selectedDeployment.LlmParams.BedrockLlmParams.GuardrailVersion}
                        </ValueWithLabel>
                    )}
                </SpaceBetween>
            }
        </SpaceBetween>
    );
};
