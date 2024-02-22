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

import KnowledgeBaseType from '../KnowledgeBaseType';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('KnowledgeBaseType', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockKnowledgeBaseData = {
            knowledgeBaseType: { value: 'Kendra', label: 'Kendra' }
        };

        const { cloudscapeWrapper } = cloudscapeRender(
            <KnowledgeBaseType {...mockFormComponentCallbacks()} knowledgeBaseData={mockKnowledgeBaseData} />
        );

        expect(screen.getByTestId('select-knowledgebase-type-container')).toBeDefined();
        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(1);
        expect(select?.findDropdown().findOptionByValue('Kendra')).toBeTruthy();
    });
});
