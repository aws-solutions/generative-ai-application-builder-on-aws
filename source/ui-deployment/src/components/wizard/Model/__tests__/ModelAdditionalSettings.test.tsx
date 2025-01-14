// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as QueryHooks from 'hooks/useQueries';
import ModelAdditionalSettings from '../ModelAdditionalSettings';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { cleanup, screen } from '@testing-library/react';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('ModelAdditionalSettings', () => {
    afterEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    test('renders model additional settings footer', async () => {
        vi.spyOn(QueryHooks, 'useModelStreamingQuery').mockReturnValue({
            isLoading: false,
            isError: false,
            data: true
        } as any);

        const mockAdditionalSettingsProps = {
            modelData: {
                temperature: 0.3,
                verbose: false,
                promptTemplate: 'fake prompt template',
                modelName: 'amazon.titan-text-express-v1',
                modelProvider: {
                    label: 'Bedrock',
                    value: 'Bedrock'
                }
            },
            modelName: 'amazon.titan-text-express-v1',
            modelProvider: {
                label: 'Bedrock',
                value: 'Bedrock'
            },
            isRagEnabled: false
        };
        renderWithProvider(
            <ModelAdditionalSettings {...mockAdditionalSettingsProps} {...mockFormComponentCallbacks()} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );
        expect(screen.getByTestId('model-additional-settings')).toBeDefined();
        expect(screen.getByTestId('model-streaming-field')).toBeDefined();
        expect(screen.getByTestId('model-verbose-field')).toBeDefined();
    });
});
