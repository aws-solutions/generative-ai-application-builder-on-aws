// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider, mockFormComponentCallbacks, mockReactMarkdown, mockModelNamesQuery } from '@/utils';
import { screen } from '@testing-library/react';

import { BEDROCK_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '../../steps-config';
import { ModelProviderOption } from '../../interfaces';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

let Model: any;

describe('Model', () => {
    beforeEach(async () => {
        // lazy loading Model with mocked react markdown components
        mockReactMarkdown();
        Model = (await import('../Model')).default;
        mockModelNamesQuery();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders with the right components', () => {
        const mockModelData = {
            info: {
                model: {
                    modelName: 'amazon.titan-text-express-v1',
                    modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX] as ModelProviderOption,
                    temperature: 0.3,
                    streaming: true,
                    verbose: false,
                    multimodalEnabled: false,
                    modelParameters: []
                },
                knowledgeBase: {
                    modelName: false
                }
            }
        };
        const callbacks = mockFormComponentCallbacks();
        renderWithProvider(<Model {...mockModelData} {...callbacks} />, { route: USECASE_TYPE_ROUTE.TEXT });
        expect(screen.getByTestId('model-provider-field')).toBeDefined();
        expect(screen.getByTestId('step2-additional-settings-expandable')).toBeDefined();
    });
});
