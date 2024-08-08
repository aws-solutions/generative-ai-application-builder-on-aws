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

import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';
import AdvancedKnowledgeBaseConfig from '../AdvancedKnowledgeBaseConfig';
import { KNOWLEDGE_BASE_TYPES } from '../../steps-config';

describe('AdvancedKnowledgeBaseConfig', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders advanced knowledge base container when kendra is selected', () => {
        const mockKnowledgeBaseData = {
            maxNumDocs: '5',
            returnDocumentSource: true,
            knowledgeBaseType: KNOWLEDGE_BASE_TYPES[0]
        };
        cloudscapeRender(
            <AdvancedKnowledgeBaseConfig knowledgeBaseData={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />
        );

        expect(screen.getByTestId('advanced-knowledgebase-config-container')).toBeDefined();
        expect(screen.getByTestId('input-max-num-docs')).toBeDefined();
        expect(screen.getByTestId('display-document-source-field')).toBeDefined();
        expect(screen.getByTestId('enable-role-based-access-control-field')).toBeDefined();
        expect(screen.getByTestId('kendra-attribute-editor')).toBeDefined();
    });

    test('renders advanced knowledge base container when bedrock is selected', async () => {
        const mockKnowledgeBaseData = {
            maxNumDocs: '5',
            returnDocumentSource: true,
            knowledgeBaseType: KNOWLEDGE_BASE_TYPES[1],
            enableRoleBasedAccessControl: false
        };
        cloudscapeRender(
            <AdvancedKnowledgeBaseConfig knowledgeBaseData={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />
        );

        expect(screen.getByTestId('advanced-knowledgebase-config-container')).toBeDefined();
        expect(screen.getByTestId('input-max-num-docs')).toBeDefined();
        expect(screen.getByTestId('display-document-source-field')).toBeDefined();
        expect(screen.getByTestId('bedrock-retrieval-filter')).toBeDefined();
        expect(screen.queryByTestId('enable-role-based-access-control-field')).toBeNull();
    });
});
