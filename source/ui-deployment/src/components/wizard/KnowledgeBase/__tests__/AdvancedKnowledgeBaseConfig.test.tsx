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

describe('AdvancedKnowledgeBaseConfig', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockKnowledgeBaseData = {
            maxNumDocs: '5',
            returnDocumentSource: true
        };
        cloudscapeRender(
            <AdvancedKnowledgeBaseConfig knowledgeBaseData={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />
        );

        expect(screen.getByTestId('advanced-knowledgebase-config-container')).toBeDefined();
        expect(screen.getByTestId('input-max-num-docs')).toBeDefined();
        expect(screen.getByTestId('display-document-source-field')).toBeDefined();
    });
});
