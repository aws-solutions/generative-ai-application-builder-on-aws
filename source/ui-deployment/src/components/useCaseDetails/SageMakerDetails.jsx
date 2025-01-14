// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
