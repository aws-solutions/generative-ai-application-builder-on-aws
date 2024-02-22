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
import KendraStorageCapacity from '../KendraStorageCapacity';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('KendraIndexId', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockKnowledgeBaseData = {
            kendraAdditionalStorageCapacity: 0
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <KendraStorageCapacity knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('kendra-add-storage-capacity')).toBeDefined();

        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('3');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            kendraAdditionalStorageCapacity: '3'
        });
    });
});
