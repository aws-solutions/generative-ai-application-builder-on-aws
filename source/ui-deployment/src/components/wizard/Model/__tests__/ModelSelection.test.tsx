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
