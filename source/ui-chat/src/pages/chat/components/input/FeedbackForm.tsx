// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FEEDBACK_HELPFUL, FEEDBACK_NOT_HELPFUL, MAX_FEEDBACK_INPUT_LENGTH } from '@/utils';
import { Button, Checkbox, FormField, Input, SpaceBetween } from '@cloudscape-design/components';
import { useEffect, useState } from 'react';

export type FeedbackType = 'helpful' | 'not-helpful' | '';

export interface FeedbackFormProps {
    onSubmit: (data: FeedbackFormData) => void;
    onCancel: () => void;
    feedbackType: FeedbackType;
    isLoading?: boolean;
}

export interface FeedbackFormData {
    comment: string;
    reasons: string[];
    type?: FeedbackType;
    timestamp?: string;
}

const FEEDBACK_REASONS = [
    { label: 'Inaccurate', value: 'Inaccurate' },
    { label: 'Incomplete or insufficient', value: 'Incomplete or insufficient' },
    { label: 'Harmful', value: 'Harmful' },
    { label: 'Other', value: 'Other' }
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, onCancel, feedbackType, isLoading = false }) => {
    const [feedbackData, setFeedbackData] = useState<FeedbackFormData>({
        comment: '',
        reasons: []
    });
    const [feedbackCommentError, setFeedbackCommentError] = useState('');

    useEffect(() => {
        if (feedbackType === FEEDBACK_HELPFUL) {
            setFeedbackData((prev) => ({
                ...prev,
                reasons: []
            }));
        }
    }, [feedbackType]);

    const validateFeedbackCommentInput = (feedbackComment: string) => {
        // Check length constraints
        if (feedbackComment.length > MAX_FEEDBACK_INPUT_LENGTH) {
            return {
                isValid: false,
                error: `The feedback comment has too many characters. Character count: ${feedbackComment.length}/${MAX_FEEDBACK_INPUT_LENGTH}`
            };
        }

        // Check for invalid characters
        const validCharsRegex = /^[a-zA-Z0-9 .,!?-]*$/;
        if (!validCharsRegex.test(feedbackComment)) {
            return {
                isValid: false,
                error: 'Feedback can only contain letters, numbers, spaces, and basic punctuation (.,!?-)'
            };
        }

        return { isValid: true, error: '' };
    };

    const handleFeedbackCommentChange = (value: string) => {
        // Set the raw input value in state
        setFeedbackData((prev) => ({ ...prev, comment: value }));

        // Validate the input
        const { error } = validateFeedbackCommentInput(value);
        setFeedbackCommentError(error);
    };

    return (
        <SpaceBetween size="m" data-testid="feedback-form">
            <FormField
                label="Comment - optional"
                errorText={feedbackCommentError}
                data-testid="feedback-form-comment-field"
            >
                <Input
                    value={feedbackData.comment}
                    onChange={({ detail }) => handleFeedbackCommentChange(detail.value)}
                    placeholder={`Tell us why this response was ${feedbackType}...`}
                    data-testid="feedback-form-comment-input"
                    autoComplete="off"
                />
            </FormField>

            {feedbackType === FEEDBACK_NOT_HELPFUL && (
                <FormField label="Feedback reasons - optional" data-testid="feedback-form-reasons-field">
                    {FEEDBACK_REASONS.map((reason) => (
                        <Checkbox
                            key={reason.value}
                            checked={feedbackData.reasons.includes(reason.value)}
                            onChange={({ detail }) => {
                                setFeedbackData((prev) => ({
                                    ...prev,
                                    reasons: detail.checked
                                        ? [...prev.reasons, reason.value]
                                        : prev.reasons.filter((r) => r !== reason.value)
                                }));
                            }}
                            data-testid={`feedback-form-reason-checkbox-${reason.value}`}
                        >
                            {reason.label}
                        </Checkbox>
                    ))}
                </FormField>
            )}

            <SpaceBetween direction="horizontal" size="xs" data-testid="feedback-form-buttons">
                <Button onClick={onCancel} disabled={isLoading} data-testid="feedback-form-cancel-button">
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={() => onSubmit(feedbackData)}
                    loading={isLoading}
                    disabled={isLoading || !!feedbackCommentError}
                    data-testid="feedback-form-submit-button"
                >
                    Submit feedback
                </Button>
            </SpaceBetween>
        </SpaceBetween>
    );
};
