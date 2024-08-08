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

import { BedrockKnowledgeBase } from '../Bedrock';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('Bedrock', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders on state to show kendra config', () => {
        const mockKnowledgeBaseData = {
            bedrockKnowledgeBaseId: ''
        };
        renderWithProvider(
            <BedrockKnowledgeBase knowledgeBaseData={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />,
            {
                route: '/mockPage'
            }
        );
        expect(screen.getByTestId('bedrock-knowledgebase-container')).toBeDefined();
        expect(screen.getByTestId('input-bedrock-knowledge-base-id')).toBeDefined();
    });
});
