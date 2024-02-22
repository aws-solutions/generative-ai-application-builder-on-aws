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

import AdditionalKendraOptions from '../AdditionalKendraOptions';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('AdditionalKendraOptions', () => {
    test('renders', () => {
        const mockKnowledgeBaseData = {
            kendraAdditionalQueryCapacity: 0,
            kendraAdditionalStorageCapacity: 0,
            kendraEdition: { value: 'developer', label: 'Developer' }
        };

        const callbacks = mockFormComponentCallbacks();

        cloudscapeRender(<AdditionalKendraOptions knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />);

        expect(screen.getByTestId('additional-kendra-options')).toBeDefined();
        expect(screen.getByTestId('kendra-edition')).toBeDefined();
        expect(screen.getByTestId('kendra-add-query-capacity')).toBeDefined();
        expect(screen.getByTestId('kendra-add-storage-capacity')).toBeDefined();
    });
});
