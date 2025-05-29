// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FormField, Link, PromptInput } from '@cloudscape-design/components';
import { memo, useCallback, useState } from 'react';
import {
    CHAT_INPUT_MAX_ROWS,
    CONSTRAINT_TEXT_ERROR_COLOR,
    DEFAULT_CHAT_INPUT_MAX_LENGTH,
    DOCS_LINKS
} from '../../../../utils/constants';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';
import { getMaxInputTextLength } from '../../../../store/configSlice';
import { formatCharacterCount } from '../../../../utils/validation';

/**
 * Props interface for the ChatInput component
 * @interface ChatInputProps
 * @property {boolean} isLoading - Flag indicating if a request is in progress
 * @property {function} onSend - Callback function triggered when a message is sent
 */
interface ChatInputProps {
    isLoading: boolean;
    onSend: (value: string) => void;
}

/**
 * ChatInput component that renders a form field with a prompt input
 * @param {ChatInputProps} props - Component props
 * @param {boolean} props.isLoading - Flag indicating if a request is in progress
 * @param {function} props.onSend - Callback function triggered when a message is sent
 * @returns {JSX.Element} Rendered form field with prompt input
 */
export const ChatInput = memo(({ isLoading, onSend }: ChatInputProps) => {
    const [inputText, setInputText] = useState('');

    // Selector to determine if user is internal
    const isInternalUser = useSelector((state: RootState) => state.config.runtimeConfig?.IsInternalUser) === 'true';

    const maxInputLength = useSelector((state: RootState) => {
        try {
            return getMaxInputTextLength(state);
        } catch {
            return DEFAULT_CHAT_INPUT_MAX_LENGTH;
        }
    });

    /**
     * Handles the action when user submits input
     * @param {Object} param - Event parameter object
     * @param {Object} param.detail - Contains the input value
     */
    const handleAction = useCallback(
        ({ detail }: { detail: { value: string } }) => {
            if (!detail.value?.trim() || isLoading) return;
            // Only send if the text is within the limit
            if (detail.value.length <= maxInputLength) {
                onSend(detail.value);
                setInputText('');
            }
        },
        [isLoading, onSend, maxInputLength]
    );

    const characterCount = inputText.length;
    const isOverLimit = characterCount > maxInputLength;

    return (
        <FormField
            stretch
            constraintText={
                <>
                    <span style={{ color: isOverLimit ? CONSTRAINT_TEXT_ERROR_COLOR : 'inherit' }}>
                        {characterCount}/{formatCharacterCount(maxInputLength)} characters.{' '}
                    </span>
                    {isInternalUser && (
                        <>
                            Use of this service is subject to the{' '}
                            <Link href={DOCS_LINKS.GEN_AI_POLICY} external variant="primary" fontSize="inherit">
                                Third Party Generative AI Use Policy
                            </Link>
                            .
                        </>
                    )}
                </>
            }
        >
            <PromptInput
                onChange={({ detail }) => {
                    // Allow any length of input
                    setInputText(detail.value);
                }}
                onAction={handleAction}
                value={inputText}
                actionButtonAriaLabel={
                    isLoading
                        ? 'Send message button - suppressed'
                        : isOverLimit
                          ? 'Cannot send - message too long'
                          : 'Send message'
                }
                actionButtonIconName="send"
                ariaLabel={isLoading ? 'Chat input text - suppressed' : 'Chat input text'}
                placeholder="Ask a question"
                autoFocus
                maxRows={CHAT_INPUT_MAX_ROWS}
                data-testid="chat-input"
            />
        </FormField>
    );
});
