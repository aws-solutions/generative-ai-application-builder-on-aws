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

import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import KnowledgeBaseSelection from '../KnowledgeBaseSelection';
import { KNOWLEDGE_BASE_TYPES } from '../../steps-config';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('KnowledgeBaseSelection', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should render kendra knowledge base components', () => {
        const mockKnowledgeBaseData = {
            knowledgeBaseType: KNOWLEDGE_BASE_TYPES.find((kb) => kb.value === 'Kendra')
        };
        renderWithProvider(
            <KnowledgeBaseSelection {...mockFormComponentCallbacks()} knowledgeBaseData={mockKnowledgeBaseData} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );
        expect(screen.getByTestId('kendra-container')).toBeDefined();
    });

    test('should render bedrock knowledge base components', () => {
        const mockKnowledgeBaseData = {
            knowledgeBaseType: KNOWLEDGE_BASE_TYPES.find((kb) => kb.value === 'Bedrock')
        };
        renderWithProvider(
            <KnowledgeBaseSelection {...mockFormComponentCallbacks()} knowledgeBaseData={mockKnowledgeBaseData} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );
        expect(screen.getByTestId('bedrock-knowledgebase-container')).toBeDefined();
    });
});
