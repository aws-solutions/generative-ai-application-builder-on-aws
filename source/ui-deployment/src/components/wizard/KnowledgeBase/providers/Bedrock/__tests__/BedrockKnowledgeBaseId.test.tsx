// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
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
