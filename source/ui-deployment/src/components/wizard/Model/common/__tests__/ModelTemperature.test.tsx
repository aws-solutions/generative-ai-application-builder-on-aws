// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockFormComponentCallbacks, mockedAuthenticator, renderWithProvider } from '@/utils';
import { ModelTemperature } from '../ModelTemperature';
import { BEDROCK_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '@/components/wizard/steps-config';
import { API, Auth } from 'aws-amplify';
import { waitFor } from '@testing-library/react';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('ModelTemperature', () => {
    const mockAPI = {
        get: jest.fn()
    };
    beforeEach(() => {
        mockAPI.get.mockResolvedValue({
            AllowsStreaming: true
        });

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders properly for bedrock models', async () => {
        const mockModelTemperatureProps = {
            modelData: { temperature: 0.3 },
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            modelName: 'amazon.titan-text-express-v1'
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = renderWithProvider(
            <ModelTemperature {...mockModelTemperatureProps} {...callbacks} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalledTimes(1);
        });

        const input = cloudscapeWrapper.findInput('[data-testid="model-temperature-input"]');
        expect(input?.getInputValue()).toEqual('0.3');

        input?.focus();
        input?.setInputValue('0.4');
        input?.blur();

        expect(callbacks.onChangeFn).toHaveBeenCalledTimes(1);
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            temperature: 0.4
        });
    });
});
