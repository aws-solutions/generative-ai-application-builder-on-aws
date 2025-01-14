// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockFormComponentCallbacks, mockReactMarkdown, renderWithProvider, mockModelNamesQuery } from '@/utils';
import { screen } from '@testing-library/react';
import { BEDROCK_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '../../steps-config';
import { ModelProviderOption } from '../../interfaces';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

let ModelSelection: any;

describe('ModelSelection', () => {
    beforeEach(async () => {
        mockReactMarkdown();
        ModelSelection = (await import('../ModelSelection')).default;
        mockModelNamesQuery();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders bedrock model components', () => {
        const mockModelSelectionProps = {
            modelData: { modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX] as ModelProviderOption }
        };

        renderWithProvider(<ModelSelection {...mockModelSelectionProps} {...mockFormComponentCallbacks()} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        expect(screen.getByTestId('bedrock-model-components')).toBeDefined();
    });
});
