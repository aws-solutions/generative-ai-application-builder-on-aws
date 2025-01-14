// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SageMakerEndpointNameInput } from '../SageMakerEndpointName';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';

describe('SageMakerEndpointNameInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockModelData = {
            sagemakerEndpointName: 'fake-sagemaker-endpoint'
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <SageMakerEndpointNameInput modelData={mockModelData} {...callbacks} />
        );
        expect(screen.getByTestId('model-inference-endpoint-name-field')).toBeDefined();
        expect(
            cloudscapeWrapper.findInput('[data-testid="model-inference-endpoint-name-input"]')?.getInputValue()
        ).toEqual('fake-sagemaker-endpoint');

        cloudscapeWrapper
            .findInput('[data-testid="model-inference-endpoint-name-input"]')
            ?.setInputValue('new-fake-sagemaker-endpoint');
        expect(callbacks.onChangeFn).toHaveBeenCalledTimes(1);
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            sagemakerEndpointName: 'new-fake-sagemaker-endpoint'
        });
    });
});
