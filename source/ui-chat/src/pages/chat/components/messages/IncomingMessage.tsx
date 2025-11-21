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
import { ThinkingIndicator } from '@/components/thinking/ThinkingIndicator';
import { ToolUsageList } from '@/components/tool-usage/ToolUsageList';
import { AgentBuilderChatBubbleMessage } from '../../types';
import { useSelector } from 'react-redux';
import { selectUseCaseType } from '@/store/configSlice';
import { USE_CASE_TYPES } from '@/utils/constants';

const isAgentBuilderMessage = (message: any): message is AgentBuilderChatBubbleMessage => {
    return message && 'thinking' in message && message.thinking !== undefined;
};

export const IncomingMessage = ({ message, author, showActions, conversationId, toolUsage, 'data-testid': dataTestId }: IncomingMessageProps) => {
    const [showFeedbackConfirmation, setShowFeedbackConfirmation] = useState(false);
    const useCaseType = useSelector(selectUseCaseType);
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
    
    const shouldShowThinkingIndicator = (useCaseType === USE_CASE_TYPES.AGENT_BUILDER || useCaseType === USE_CASE_TYPES.WORKFLOW) && isAgentBuilderMessage(message);
    
    const shouldShowToolUsage = (useCaseType === USE_CASE_TYPES.AGENT_BUILDER || useCaseType === USE_CASE_TYPES.WORKFLOW) && toolUsage && toolUsage.length > 0;

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
                
                {shouldShowToolUsage && (
                    <ToolUsageList 
                        toolUsage={toolUsage!} 
                        data-testid="message-tool-usage"
                    />
                )}
                
                {shouldShowThinkingIndicator && message.thinking && (
                    <ThinkingIndicator 
                        thinking={message.thinking} 
                        data-testid="message-thinking-indicator"
                    />
                )}
                
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
