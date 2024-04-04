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

import { renderWithProvider, mockFormComponentCallbacks, mockReactMarkdown } from '@/utils';
import { screen } from '@testing-library/react';

import { BEDROCK_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '../../steps-config';
import { ModelProviderOption } from '../../interfaces';

let Model: any;

describe('Model', () => {
    beforeEach(() => {
        // lazy loading Model with mocked react markdown components
        mockReactMarkdown();
        Model = require('../Model').default;
    });

    afterEach(() => {
        jest.clearAllMocks();
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
                    promptTemplate: 'fake prompt template',
                    modelParameters: []
                },
                knowledgeBase: {
                    modelName: false
                }
            }
        };
        const callbacks = mockFormComponentCallbacks();
        renderWithProvider(<Model {...mockModelData} {...callbacks} />, { route: '/wizardView' });
        expect(screen.getByTestId('model-provider-field')).toBeDefined();
        expect(screen.getByTestId('step2-additional-settings-expandable')).toBeDefined();
    });
});
