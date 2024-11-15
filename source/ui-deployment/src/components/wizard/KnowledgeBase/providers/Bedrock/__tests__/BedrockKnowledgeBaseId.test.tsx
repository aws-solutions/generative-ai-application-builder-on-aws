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
import { BedrockKnowledgeBaseId } from '../BedrockKnowledgeBaseId';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('BedrockKnowledgeBaseId', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders component with default value for knowledge base id', () => {
        const mockKnowledgeBaseData = {
            bedrockKnowledgeBaseId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockKnowledgeBaseId knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('input-bedrock-knowledge-base-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();
    });

    test('renders with a invalid id', () => {
        const mockKnowledgeBaseData = {
            bedrockKnowledgeBaseId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockKnowledgeBaseId knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('input-bedrock-knowledge-base-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('fake-bedrock-knowledge-indexid');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockKnowledgeBaseId: 'fake-bedrock-knowledge-indexid'
        });
        expect(callbacks.setNumFieldsInError).toHaveBeenCalledTimes(1);

        const err = cloudscapeWrapper.findFormField()?.findError();
        expect(err?.getElement().innerHTML).toEqual('Does not match pattern of a valid Bedrock Knowledge Base ID');
    });

    test('renders with a valid kendra index id', () => {
        const mockKnowledgeBaseData = {
            bedrockKnowledgeBaseId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <BedrockKnowledgeBaseId knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('input-bedrock-knowledge-base-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('1111111111');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockKnowledgeBaseId: '1111111111'
        });
        expect(callbacks.setNumFieldsInError).toHaveBeenCalledTimes(0);
    });
});
