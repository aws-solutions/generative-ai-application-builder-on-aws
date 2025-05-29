// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ChatBubble } from '@cloudscape-design/chat-components';
import { ChatBubbleAvatar } from '@/components/common/common-components';
import { ChatBubbleActions } from '../actions/ChatBubbleActions';
import MarkdownContent from '@/components/markdown/MarkdownContent';
import { SourceDocumentsSection } from '../source-documents/SourceDocument';
import { IncomingMessageProps } from './types';
import { useEffect, useState } from 'react';
import { FeedbackForm } from '../input/FeedbackForm';
import { useFeedback } from '@/hooks/use-feedback';
import { StatusIndicator } from '@cloudscape-design/components';

export const IncomingMessage = ({ message, author, showActions, conversationId, 'data-testid': dataTestId }: IncomingMessageProps) => {
    const [showFeedbackConfirmation, setShowFeedbackConfirmation] = useState(false);
    const {
        showFeedbackForm,
        setShowFeedbackForm,
        feedbackType,
        feedbackSubmitted,
        feedbackError,
        isSubmittingFeedback,
        handleFeedbackButtonClick,
        handleFeedbackSubmit
    } = useFeedback(message, conversationId);

    // Reset feedback form state when message changes
    useEffect(() => {
        setShowFeedbackForm(false);
    }, [message.authorId, message.timestamp, message.messageId, setShowFeedbackForm]);

    // Show feedback confirmation when feedback is submitted
    useEffect(() => {
        if (feedbackSubmitted || feedbackError) {
            setShowFeedbackConfirmation(true);
            if (feedbackSubmitted) {
                const timer = setTimeout(() => {
                    setShowFeedbackConfirmation(false);
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [feedbackSubmitted, feedbackError]);

    return (
        <>
            <ChatBubble
                key={message.authorId + message.timestamp}
                avatar={<ChatBubbleAvatar {...author} loading={message.avatarLoading} />}
                ariaLabel={`${author.name} at ${message.timestamp}`}
                type="incoming"
                hideAvatar={message.hideAvatar}
                actions={
                    showActions ? (
                        <ChatBubbleActions
                            content={String(message.content)}
                            onFeedback={handleFeedbackButtonClick}
                            feedbackSubmitted={feedbackSubmitted}
                            feedbackType={feedbackType}
                        />
                    ) : undefined
                }
                showLoadingBar={message.avatarLoading}
                data-testid={dataTestId}
            >
                <MarkdownContent content={String(message.content)} />
                {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                    <SourceDocumentsSection sourceDocuments={message.sourceDocuments} />
                )}
                {showFeedbackForm && (
                    <FeedbackForm
                        onSubmit={handleFeedbackSubmit}
                        onCancel={() => setShowFeedbackForm(false)}
                        feedbackType={feedbackType}
                        isLoading={isSubmittingFeedback}
                    />
                )}
                {showFeedbackConfirmation && (
                    <StatusIndicator 
                        type={feedbackError ? "error" : "success"} 
                        data-testid="feedback-confirmation"
                    >
                        {feedbackError || "Thank you for your feedback!"}
                    </StatusIndicator>
                )}
            </ChatBubble>
        </>
    );
};
