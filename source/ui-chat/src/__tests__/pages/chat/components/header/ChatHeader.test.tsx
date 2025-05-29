// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { testStoreFactory } from '../../../../utils/test-redux-store-factory';
import { ChatHeader } from '../../../../../pages/chat/components/header/ChatHeader';

describe('ChatHeader', () => {
    const onRefresh = vi.fn();
    const onSettings = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('render with the correct use case name', () => {
        const { container } = testStoreFactory.renderWithStore(
            <ChatHeader onRefresh={onRefresh} onSettings={onSettings} />
        );

        const wrapper = createWrapper(container);
        const header = wrapper.findHeader();
        expect(header?.findHeadingText().getElement()).toHaveTextContent('text');
        expect(header?.findHeadingText().getElement()).toHaveTextContent('test-text-use-case');
    });
});
