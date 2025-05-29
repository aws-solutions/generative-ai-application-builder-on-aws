// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react';
import { OutgoingMessageProps } from './types';
import { ChatBubble } from '@cloudscape-design/chat-components';
import { ChatBubbleAvatar } from '../../../../components/common/common-components';
import MarkdownContent from '../../../../components/markdown/MarkdownContent';
import '../../styles/OutgoingMessage.scss';

const ChevronIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 11L3 6h10l-5 5z" />
    </svg>
);

export const OutgoingMessage = ({
    message,
    author,
    'data-testid': dataTestId,
    previewHeight = 200
}: OutgoingMessageProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const content = String(message.content);

    useEffect(() => {
        if (contentRef.current) {
            setIsOverflowing(contentRef.current.scrollHeight > previewHeight);
        }
    }, [content, previewHeight]);

    return (
        <ChatBubble
            key={message.authorId + message.timestamp}
            avatar={<ChatBubbleAvatar {...author} loading={message.avatarLoading} />}
            ariaLabel={`${author.name} at ${message.timestamp}`}
            type="outgoing"
            hideAvatar={message.hideAvatar}
            showLoadingBar={message.avatarLoading}
            data-testid={dataTestId}
        >
            <div
                className="outgoing-message__content-wrapper"
                style={{
                    maxHeight: isExpanded ? 'none' : `${previewHeight}px`
                }}
            >
                <div ref={contentRef}>
                    <MarkdownContent content={content} />
                </div>

                {isOverflowing && !isExpanded && (
                    <>
                        <div className="outgoing-message__gradient-overlay" />
                        <div className="outgoing-message__action-button" onClick={() => setIsExpanded(true)}>
                            <span>Show more</span>
                            <ChevronIcon className="outgoing-message__action-button-icon" />
                        </div>
                    </>
                )}

                {isOverflowing && isExpanded && (
                    <div
                        className="outgoing-message__action-button outgoing-message__action-button--expanded"
                        onClick={() => setIsExpanded(false)}
                    >
                        <span>Show less</span>
                        <ChevronIcon className="outgoing-message__action-button-icon outgoing-message__action-button-icon--rotated" />
                    </div>
                )}
            </div>
        </ChatBubble>
    );
};
