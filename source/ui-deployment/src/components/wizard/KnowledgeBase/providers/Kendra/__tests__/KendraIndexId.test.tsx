// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import KendraIndexId from '../KendraIndexId';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('KendraIndexId', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders component with default value for index id', () => {
        const mockKnowledgeBaseData = {
            kendraIndexId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <KendraIndexId knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('input-kendra-index-id')).toBeDefined();
        expect(cloudscapeWrapper.findInput()).toBeDefined();
    });

    test('renders with a invalid kendra index id', () => {
        const mockKnowledgeBaseData = {
            kendraIndexId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <KendraIndexId knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('input-kendra-index-id')).toBeDefined();

        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('fake-kendra-indexid');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            kendraIndexId: 'fake-kendra-indexid'
        });
        expect(callbacks.setNumFieldsInError).toHaveBeenCalledTimes(1);

        const err = cloudscapeWrapper.findFormField()?.findError();
        expect(err?.getElement().innerHTML).toEqual('Does not match pattern of a valid Kendra index ID');
    });

    test('renders with a valid kendra index id', () => {
        const mockKnowledgeBaseData = {
            kendraIndexId: ''
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <KendraIndexId knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('input-kendra-index-id')).toBeDefined();

        expect(cloudscapeWrapper.findInput()).toBeDefined();

        const input = cloudscapeWrapper.findInput();
        input?.setInputValue('00000000-aaaa-bbbb-cccc-000000000000');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            kendraIndexId: '00000000-aaaa-bbbb-cccc-000000000000'
        });
        expect(callbacks.setNumFieldsInError).toHaveBeenCalledTimes(0);
    });
});
