// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import ButtonGroup, { ButtonGroupProps } from '@cloudscape-design/components/button-group';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { getFeedbackEnabledState } from '@/store/configSlice';
import { FEEDBACK_HELPFUL, FEEDBACK_NOT_HELPFUL } from '@/utils';

/**
 * Props interface for ChatBubbleActions component
 * @interface ChatBubbleActionsProps
 * @property {string} content - The text content to be copied
 * @property {function} onFeedback - Callback function when feedback is provided
 * @property {boolean} feedbackSubmitted - Indicates if feedback has been submitted
 */
interface ChatBubbleActionsProps {
    content: string;
    onFeedback: (feedback: typeof FEEDBACK_HELPFUL | typeof FEEDBACK_NOT_HELPFUL) => void;
    feedbackSubmitted: boolean;
    feedbackType: string;
}

/**
 * Component that renders action buttons for chat bubbles including feedback and copy functionality
 * @param {ChatBubbleActionsProps} props - Component props
 * @returns {JSX.Element} Button group with feedback and copy actions
 */
export const ChatBubbleActions: React.FC<ChatBubbleActionsProps> = ({
    content,
    onFeedback,
    feedbackSubmitted,
    feedbackType
}: ChatBubbleActionsProps) => {
    const feedbackEnabledState = useSelector((state: RootState) => getFeedbackEnabledState(state));

    /**
     * Handles copying content to clipboard
     */
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
        } catch (error) {
            console.error('Failed to copy message:', error);
        }
    };

    /**
     * Handles button click events for copy and feedback actions
     * @param {Object} param - Event parameter object
     * @param {Object} param.detail - Details of the clicked item
     * @param {string} param.detail.id - ID of the clicked item
     * @param {boolean} [param.detail.pressed] - Press state for toggle buttons
     */
    const handleItemClick = ({ detail }: { detail: { id: string; pressed?: boolean } }) => {
        if (detail.id === 'copy') {
            handleCopy();
            return;
        }
        if (!feedbackSubmitted) {
            if (detail.id === FEEDBACK_HELPFUL) {
                onFeedback(FEEDBACK_HELPFUL);
            } else if (detail.id === FEEDBACK_NOT_HELPFUL) {
                onFeedback(FEEDBACK_NOT_HELPFUL);
            }
        }
    };

    // Prepare items array based on feedback enabled state
    const actionItems = [];

    // Only add feedback buttons if feedback is enabled
    if (feedbackEnabledState) {
        actionItems.push({
            type: 'group',
            text: 'Feedback',
            items: [
                {
                    type: 'icon-button',
                    id: FEEDBACK_HELPFUL,
                    iconName: feedbackType === FEEDBACK_HELPFUL ? 'thumbs-up-filled' : 'thumbs-up',
                    text: 'Helpful',
                    disabled: feedbackSubmitted,
                    'data-testid': 'feedback-helpful-button'
                },
                {
                    type: 'icon-button',
                    id: FEEDBACK_NOT_HELPFUL,
                    iconName: feedbackType === FEEDBACK_NOT_HELPFUL ? 'thumbs-down-filled' : 'thumbs-down',
                    text: 'Not helpful',
                    disabled: feedbackSubmitted,
                    'data-testid': 'feedback-not-helpful-button'
                }
            ]
        });
    }

    // Always add copy button
    actionItems.push({
        type: 'icon-button',
        id: 'copy',
        iconName: 'copy',
        text: 'Copy',
        popoverFeedback: <StatusIndicator type="success">Message copied</StatusIndicator>,
        'data-testid': 'copy-button'
    });

    return (
        <ButtonGroup
            ariaLabel="Chat bubble actions"
            variant="icon"
            onItemClick={handleItemClick}
            items={actionItems as ButtonGroupProps.ItemOrGroup[]}
            data-testid="chat-bubble-actions-btn-grp"
        />
    );
};
