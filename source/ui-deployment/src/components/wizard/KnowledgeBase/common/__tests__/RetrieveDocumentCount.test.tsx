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

import RetrieveDocumentCount from '../RetrieveDocumentCount';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('RetrieveDocumentCount', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders with default value and handles changes', () => {
        const mockKnowledgeBaseData = {
            maxNumDocs: '2'
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <RetrieveDocumentCount knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );
        expect(screen.getByTestId('input-max-num-docs')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('3');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            maxNumDocs: '3'
        });
    });

    test('renders with error', () => {
        const mockKnowledgeBaseData = {
            maxNumDocs: 2
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <RetrieveDocumentCount knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );
        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('3000');
        expect(callbacks.setNumFieldsInError).toHaveBeenCalled();
    });
});
