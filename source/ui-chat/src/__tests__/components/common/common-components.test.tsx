// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AUTHORS } from '../../../pages/chat/config';
import '@cloudscape-design/chat-components/test-utils/dom';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { ScrollableContainer, ChatBubbleAvatar, Actions } from '../../../components/common/common-components';

describe('Common Components', () => {
    describe('ScrollableContainer', () => {
        it('renders children in a scrollable container with correct styles', () => {
            const ref = React.createRef<HTMLDivElement>();
            const { container } = render(
                <ScrollableContainer ref={ref}>
                    <div>Scrollable Content</div>
                </ScrollableContainer>
            );

            const scrollContainer = screen.getByTestId('chat-scroll-container');
            expect(scrollContainer).toBeInTheDocument();
            expect(scrollContainer.style.overflowY).toBe('auto');
            expect(scrollContainer.style.position).toBe('absolute');
            expect(scrollContainer.style.inset).toBe('0');
        });
    });

    describe('ChatBubbleAvatar', () => {
        it('renders assistant avatar correctly', () => {
            const { container } = render(
                <ChatBubbleAvatar type={AUTHORS.ASSISTANT} name="AI Assistant" initials="AI" loading={false} />
            );

            const wrapper = createWrapper(container);
            const avatar = wrapper.findAvatar();
            expect(avatar?.getElement()).toHaveAttribute('aria-label', 'AI Assistant');
        });

        it('renders user avatar correctly', () => {
            const { container } = render(
                <ChatBubbleAvatar type={AUTHORS.ASSISTANT} name="Test User" initials="TU" loading={false} />
            );

            const wrapper = createWrapper(container);
            const avatar = wrapper.findAvatar();
            expect(avatar?.getElement()).toHaveAttribute('aria-label', 'Test User');
        });

        it('shows the toop tip text correctly', () => {
            const { container } = render(
                <ChatBubbleAvatar type={AUTHORS.ASSISTANT} name="AI Assistant" initials="AI" loading={false} />
            );

            const wrapper = createWrapper(container);
            const avatar = wrapper.findAvatar();
            avatar?.focus();
            const tooltip = avatar!.findTooltip();
            expect(tooltip?.getElement().textContent).toContain('AI Assistant');
        });
    });

    describe('Actions', () => {
        it('renders copy button', () => {
            const { container } = render(<Actions />);
            const wrapper = createWrapper(container);
            const buttonGroup = wrapper.findButtonGroup();

            expect(buttonGroup).toBeDefined();
            const buttons = wrapper.findAllButtons();
            expect(buttons).toHaveLength(1);

            const copyButton = buttonGroup?.findButtonById('copy');
            expect(copyButton).toBeDefined();
        });

        it('renders success indicator in popover feedback', () => {
            const { container } = render(<Actions />);
            const wrapper = createWrapper(container);

            const buttonGroup = wrapper.findButtonGroup();
            const copyButton = buttonGroup?.findButtonById('copy');
            copyButton?.focus();
            copyButton?.click();

            const popover = wrapper.findStatusIndicator();
            expect(popover).toBeDefined();
        });
    });
});
