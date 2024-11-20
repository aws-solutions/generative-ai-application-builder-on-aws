/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

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
