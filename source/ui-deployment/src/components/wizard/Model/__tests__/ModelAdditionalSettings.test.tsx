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

import * as QueryHooks from 'hooks/useQueries';
import ModelAdditionalSettings from '../ModelAdditionalSettings';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('ModelAdditionalSettings', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders model additional settings footer', async () => {
        jest.spyOn(QueryHooks, 'useModelStreamingQuery').mockReturnValue({
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
            { route: '/wizardView' }
        );
        expect(screen.getByTestId('model-additional-settings')).toBeDefined();
        expect(screen.getByTestId('model-streaming-field')).toBeDefined();
        expect(screen.getByTestId('model-verbose-field')).toBeDefined();
        expect(screen.getByTestId('model-system-prompt-field')).toBeDefined();
    });
});
