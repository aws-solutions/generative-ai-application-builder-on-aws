// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpaceBetween, StatusIndicator } from '@cloudscape-design/components';

import { SAGEMAKER_MODEL_PROVIDER_NAME } from '@/utils/constants';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';
import JsonCodeView from '@/components/commons/json-code-view';
import { BaseDetailsContainerProps } from '../types';

/**
 * Component to display SageMaker model deployment details
 * Shows model provider, endpoint name, input schema and output JSON path
 *
 * @param {BaseDetailsContainerProps} props - Component props containing selectedDeployment
 * @returns {JSX.Element} SageMaker details view or loading indicator
 */
export const SageMakerDetails = ({ selectedDeployment }: Partial<BaseDetailsContainerProps>): JSX.Element => {
    if (!selectedDeployment || !selectedDeployment.LlmParams || !selectedDeployment.LlmParams.SageMakerLlmParams) {
        return <StatusIndicator type="loading">Loading Sagemaker details...</StatusIndicator>;
    }

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
