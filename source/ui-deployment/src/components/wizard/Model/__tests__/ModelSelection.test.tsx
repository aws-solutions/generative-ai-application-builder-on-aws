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

import { mockFormComponentCallbacks, mockReactMarkdown, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import {
    ANTHROPIC_MODEL_OPTION_IDX,
    BEDROCK_MODEL_OPTION_IDX,
    HF_INF_ENDPOINT_OPTION_IDX,
    HF_MODEL_OPTION_IDX,
    MODEL_FAMILY_PROVIDER_OPTIONS
} from '../../steps-config';
import { ModelProviderOption } from '../../interfaces';

let ModelSelection: any;

describe('ModelSelection', () => {
    beforeEach(() => {
        mockReactMarkdown();
        ModelSelection = require('../ModelSelection').default;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders bedrock model components', () => {
        const mockModelSelectionProps = {
            modelData: { modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX] as ModelProviderOption }
        };

        renderWithProvider(<ModelSelection {...mockModelSelectionProps} {...mockFormComponentCallbacks()} />, {
            route: '/wizardView'
        });

        expect(screen.getByTestId('bedrock-model-components')).toBeDefined();
    });

    test('renders huggingface model components', () => {
        const mockModelSelectionProps = {
            modelData: { modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[HF_MODEL_OPTION_IDX] as ModelProviderOption }
        };

        renderWithProvider(<ModelSelection {...mockModelSelectionProps} {...mockFormComponentCallbacks()} />, {
            route: '/wizardView'
        });

        expect(screen.getByTestId('huggingface-model-components')).toBeDefined();
    });

    test('renders anthropic model components', () => {
        const mockModelSelectionProps = {
            modelData: {
                modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[ANTHROPIC_MODEL_OPTION_IDX] as ModelProviderOption
            }
        };

        renderWithProvider(<ModelSelection {...mockModelSelectionProps} {...mockFormComponentCallbacks()} />, {
            route: '/wizardView'
        });

        expect(screen.getByTestId('anthropic-model-components')).toBeDefined();
    });

    test('renders huggingface inference model components', () => {
        const mockModelSelectionProps = {
            modelData: {
                modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX] as ModelProviderOption
            }
        };

        renderWithProvider(<ModelSelection {...mockModelSelectionProps} {...mockFormComponentCallbacks()} />, {
            route: '/wizardView'
        });

        expect(screen.getByTestId('hf-inf-endpoint-components')).toBeDefined();
    });
});
