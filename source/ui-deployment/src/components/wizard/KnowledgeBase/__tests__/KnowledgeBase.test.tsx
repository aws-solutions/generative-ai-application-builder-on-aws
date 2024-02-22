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
import KnowledgeBase from '../KnowledgeBase';

describe('KnowledgeBase', () => {
    test('renders with rag not enabled', () => {
        const mockKnowledgeBaseData = {
            knowledgeBase: { knowledgeBaseType: { value: 'Kendra', label: 'Kendra' }, isRagRequired: false }
        };
        renderWithProvider(<KnowledgeBase info={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />, {
            route: '/wizardView'
        });
        expect(screen.getByTestId('rag-required-dropdown')).toBeDefined();
        expect(() => {
            screen.getByTestId('select-knowledgebase-type-container');
        }).toThrow();
    });

    test('renders with rag enabled', () => {
        const mockKnowledgeBaseData = {
            knowledgeBase: {
                knowledgeBaseType: { value: 'Kendra', label: 'Kendra' },
                isRagRequired: true,
                existingKendraIndex: 'yes',
                kendraIndexId: 'fake-id',
                kendraAdditionalQueryCapacity: 0,
                kendraAdditionalStorageCapacity: 0,
                kendraEdition: { label: 'developer', value: 'developer' },
                maxNumDocs: 2,
                inError: false,
                kendraIndexName: '',
                returnDocumentSource: false
            }
        };
        renderWithProvider(<KnowledgeBase info={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />, {
            route: '/wizardView'
        });
        expect(screen.getByTestId('rag-required-dropdown')).toBeDefined();
        expect(screen.getByTestId('kendra-container')).toBeDefined();
        expect(screen.getByTestId('advanced-knowledgebase-config-container')).toBeDefined();
        expect(screen.getByTestId('select-knowledgebase-type-container')).toBeDefined();
    });
});
