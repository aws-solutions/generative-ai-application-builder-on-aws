// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { forwardRef } from 'react';
import { Avatar } from '@cloudscape-design/chat-components';
import { ButtonGroup, StatusIndicator } from '@cloudscape-design/components';
import { AuthorAvatarProps, AUTHORS } from '../../pages/chat/config';
export { ExternalLinkWarningModal } from './external-link-warning-modal';

/**
 * Base props interface for container components
 */
interface BaseContainerProps {
    /** Child elements to render inside the container */
    children: React.ReactNode;
    /** Optional test id for the container element */
    'data-testid'?: string;
}

/**
 * Scrollable container component that provides vertical scrolling for its content
 * @param children - Child elements to render
 * @param dataTestId - Optional test id for the container element
 * @param ref - React ref object for the scrollable div element
 */
export const ScrollableContainer = forwardRef(
    (
        { children, 'data-testid': dataTestId = 'chat-scroll-container' }: BaseContainerProps,
        ref: React.Ref<HTMLDivElement>
    ) => {
        return (
            <div style={{ position: 'relative', blockSize: '100%' }}>
                <div style={{ position: 'absolute', inset: 0, overflowY: 'auto' }} ref={ref} data-testid={dataTestId}>
                    {children}
                </div>
            </div>
        );
    }
);

/**
 * Avatar component for chat bubbles that displays either an AI assistant icon or user initials
 * @param type - Type of avatar (assistant or user)
 * @param name - Name to display in tooltip
 * @param initials - Initials to display for user avatars
 * @param loading - Loading state for assistant avatars
 */
export function ChatBubbleAvatar({ type, name, initials, loading }: AuthorAvatarProps) {
    if (type === AUTHORS.ASSISTANT) {
        return <Avatar color="gen-ai" iconName="gen-ai" tooltipText={name} ariaLabel={name} loading={loading} />;
    }

    return <Avatar initials={initials} tooltipText={name} ariaLabel={name} />;
}

/**
 * Button group component for chat message actions like copying
 */
export function Actions() {
    return (
        <ButtonGroup
            variant="icon"
            onItemClick={() => void 0}
            items={[
                {
                    type: 'icon-button',
                    id: 'copy',
                    iconName: 'copy',
                    text: 'Copy',
                    popoverFeedback: <StatusIndicator type="success">Message copied</StatusIndicator>
                }
            ]}
        />
    );
}
