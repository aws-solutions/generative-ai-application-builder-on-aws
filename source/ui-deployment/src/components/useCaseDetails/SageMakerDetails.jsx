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

import { SAGEMAKER_MODEL_PROVIDER_NAME } from '@/utils/constants';
import JsonCodeView from '../commons/json-code-view';

export const SageMakerDetails = () => {
    const {
        state: { selectedDeployment }
    } = useContext(HomeContext);

    const inputSchemaString = JSON.stringify(
        selectedDeployment.LlmParams.SageMakerLlmParams.ModelInputPayloadSchema,
        null,
        2
    );
    return (
        <SpaceBetween size="l" data-testid="sagemaker-details-container">
            {
                <SpaceBetween size="l">
                    <ValueWithLabel label={'Model Provider'}>{SAGEMAKER_MODEL_PROVIDER_NAME}</ValueWithLabel>
                    <ValueWithLabel label={'Endpoint Name'}>
                        {selectedDeployment.LlmParams.SageMakerLlmParams.EndpointName}
                    </ValueWithLabel>
                    <ValueWithLabel label={'Input Payload Schema'}>
                        <JsonCodeView content={inputSchemaString} />
                    </ValueWithLabel>
                    <ValueWithLabel label={'ModelOutputJSONPath'}>
                        {selectedDeployment.LlmParams.SageMakerLlmParams.ModelOutputJSONPath}
                    </ValueWithLabel>
                </SpaceBetween>
            }
        </SpaceBetween>
    );
};
