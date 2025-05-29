// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useSubmitFeedbackMutation } from '../store/solutionApi';
import { getUseCaseConfigKey, getUseCaseId } from '../store/configSlice';
import { FeedbackFormData, FeedbackType } from '../pages/chat/components/input/FeedbackForm';
import { ChatBubbleMessage } from '../pages/chat/types';

export interface UseFeedbackResult {
    showFeedbackForm: boolean;
    setShowFeedbackForm: (show: boolean) => void;
    feedbackType: FeedbackType;
    setFeedbackType: (type: FeedbackType) => void;
    feedbackSubmitted: boolean;
    feedbackError: string | null;
    isSubmittingFeedback: boolean;
    handleFeedbackButtonClick: (type: FeedbackType) => void;
    handleFeedbackSubmit: (feedbackData: FeedbackFormData) => void;
}

/**
 * Custom hook to manage feedback state and submission
 * @param message The message to provide feedback for
 * @param onFeedback Callback function when feedback is submitted
 * @returns Object containing feedback state and handlers
 */
export const useFeedback = (message: ChatBubbleMessage, conversationId: string): UseFeedbackResult => {
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const [submitFeedback, { isLoading: isSubmittingFeedback }] = useSubmitFeedbackMutation();
    const useCaseConfigKey = useSelector(getUseCaseConfigKey);
    const useCaseId = useSelector(getUseCaseId);

    const handleFeedbackButtonClick = (type: FeedbackType) => {
        setFeedbackType(type);
        setShowFeedbackForm(true);
    };

    const handleFeedbackSubmit = (feedbackData: FeedbackFormData) => {
        if (!useCaseId) {
            console.error('Use case ID not found in runtime config');
            return;
        }
        if (!useCaseConfigKey) {
            console.error('Use case config record key not found in runtime config');
            return;
        }

        if (!message.messageId) {
            console.error('Message ID not found for feedback submission');
            setFeedbackError('Unable to submit feedback: Message ID not found');
            return;
        }
        
        const feedbackPayload = {
            useCaseRecordKey: useCaseConfigKey,
            conversationId: conversationId,
            messageId: message.messageId,
            feedback: feedbackType === 'helpful' ? 'positive' : 'negative',
            feedbackReason: feedbackData.reasons,
            comment: feedbackData.comment,
            ...(message.rephrasedQuery && { rephrasedQuery: message.rephrasedQuery }),
            ...((message.sourceDocuments && message.sourceDocuments.length > 0) && { 
                sourceDocuments: message.sourceDocuments
                    .map(doc => doc.location)
                    .filter(Boolean) // Remove any undefined or null values
                    .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
            }),
        };

        submitFeedback({
            useCaseId,
            feedbackData: feedbackPayload
        })
            .unwrap()
            .then(() => {
                setShowFeedbackForm(false);
                setFeedbackSubmitted(true);
                setFeedbackError(null);
            })
            .catch((error) => {
                console.error('Error submitting feedback:', error);
                setShowFeedbackForm(false);
                setFeedbackSubmitted(false);
                setFeedbackError(error.data?.message || 'Failed to submit feedback. Please try again or contact a system administrator.');
            });
    };

    return {
        showFeedbackForm,
        setShowFeedbackForm,
        feedbackType,
        setFeedbackType,
        feedbackSubmitted,
        feedbackError,
        isSubmittingFeedback,
        handleFeedbackButtonClick,
        handleFeedbackSubmit
    };
};
