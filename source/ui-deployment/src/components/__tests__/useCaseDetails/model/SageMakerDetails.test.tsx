/* eslint-disable import/first */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { SageMakerDetails } from '@/components/useCaseDetails/model/SageMakerDetails';

import { cloudscapeRender } from '@/utils';

describe('SageMakerDetails', () => {
    test('shows loading indicator when no deployment is provided', () => {
        cloudscapeRender(<SageMakerDetails />);
        expect(screen.getByText('Loading Sagemaker details...')).toBeInTheDocument();
    });

    test('shows loading indicator when deployment has no LlmParams', () => {
        cloudscapeRender(<SageMakerDetails selectedDeployment={{}} />);
        expect(screen.getByText('Loading Sagemaker details...')).toBeInTheDocument();
    });

    test('shows loading indicator when deployment has no SageMakerLlmParams', () => {
        cloudscapeRender(<SageMakerDetails selectedDeployment={{ LlmParams: {} }} />);
        expect(screen.getByText('Loading Sagemaker details...')).toBeInTheDocument();
    });

    test('displays SageMaker details when valid deployment is provided', () => {
        const mockDeployment = {
            LlmParams: {
                SageMakerLlmParams: {
                    EndpointName: 'test-endpoint',
                    ModelInputPayloadSchema: { test: 'schema' },
                    ModelOutputJSONPath: '$.output'
                }
            }
        };

        cloudscapeRender(<SageMakerDetails selectedDeployment={mockDeployment} />);

        // Check if the component renders with the correct data
        expect(screen.getByTestId('sagemaker-details-container')).toBeInTheDocument();
        expect(screen.getByText('test-endpoint')).toBeInTheDocument();
        expect(screen.getByText('$.output')).toBeInTheDocument();
    });
});
