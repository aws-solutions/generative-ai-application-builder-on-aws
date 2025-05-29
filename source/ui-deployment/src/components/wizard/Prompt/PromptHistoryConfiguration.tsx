// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
    Box,
    Button,
    Container,
    FormField,
    Header,
    Input,
    InputProps,
    SpaceBetween
} from '@cloudscape-design/components';
import { IG_DOCS } from '@/utils/constants';
import { InfoLink } from '@/components/commons';
import { BaseFormComponentProps } from '../interfaces';
import { ConfirmUnsavedChangesModal } from '@/components/commons/confirm-unsaved-changes-modal';
import { MODEL_PROVIDER_NAME_MAP } from '../steps-config';

export interface PromptHistoryConfigurationProps extends BaseFormComponentProps {
    defaultChatHistoryLength?: number;
    chatHistoryLength: number;
    defaultHumanPrefix?: string;
    humanPrefix: string;
    defaultAiPrefix?: string;
    aiPrefix: string;
    modelProvider: string;
    setHistoryConfigurationInError: React.Dispatch<React.SetStateAction<boolean>>;
    'data-testid'?: string;
    // Additional props to support conditional rendering
    isRag?: boolean;
    disambiguationEnabled?: boolean;
}

export const PromptHistoryConfiguration = (props: PromptHistoryConfigurationProps) => {
    const [modalVisable, setModalVisable] = React.useState(false);
    let chatHistoryLengthError = validateUserInputNumber(props.chatHistoryLength);
    let humanPrefixError = validateUserInputPrefix(props.humanPrefix);
    let aiPrefixError = validateUserInputPrefix(props.aiPrefix);

    // Determine if we should show the prefix fields based on model provider and RAG configuration
    const shouldShowPrefixFields = () => {
        if (props.modelProvider === MODEL_PROVIDER_NAME_MAP.SageMaker) {
            return true; // Always show for SageMaker
        } else if (props.modelProvider === MODEL_PROVIDER_NAME_MAP.Bedrock) {
            return props.isRag === true; // Only show for Bedrock if RAG is enabled
        }
        return true; // Default fallback
    };

    // Determine if prefix fields should be disabled
    const arePrefixFieldsDisabled = () => {
        if (props.modelProvider === MODEL_PROVIDER_NAME_MAP.Bedrock && props.isRag === true) {
            return props.disambiguationEnabled === false; // Disable if disambiguation is disabled for Bedrock with RAG
        }
        return false; // Default is enabled
    };

    //propagate error to parent component on any changes to the error messages
    React.useEffect(() => {
        props.setHistoryConfigurationInError(
            chatHistoryLengthError.length > 0 || humanPrefixError.length > 0 || aiPrefixError.length > 0
        );
    }, [chatHistoryLengthError, humanPrefixError, aiPrefixError]);

    const handleChatHistoryLengthChange = (detail: InputProps.ChangeDetail) => {
        const userInput: number = parseFloat(detail.value);
        chatHistoryLengthError = validateUserInputNumber(userInput);

        props.onChangeFn({ chatHistoryLength: userInput });
    };

    const handleHumanPrefixChange = (detail: InputProps.ChangeDetail) => {
        const userInput: string = detail.value;
        humanPrefixError = validateUserInputPrefix(userInput);

        props.onChangeFn({ humanPrefix: userInput });
    };

    const handleAiPrefixChange = (detail: InputProps.ChangeDetail) => {
        const userInput: string = detail.value;
        aiPrefixError = validateUserInputPrefix(userInput);

        props.onChangeFn({ aiPrefix: userInput });
    };

    const handleResetClick = () => {
        props.onChangeFn({
            chatHistoryLength: props.defaultChatHistoryLength,
            humanPrefix: props.defaultHumanPrefix,
            aiPrefix: props.defaultAiPrefix
        });
        setModalVisable(false);
    };

    return (
        <Container
            header={
                <Header
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button
                                variant="normal"
                                onClick={() => setModalVisable(true)}
                                disabled={
                                    props.chatHistoryLength === props.defaultChatHistoryLength &&
                                    props.humanPrefix === props.defaultHumanPrefix &&
                                    props.aiPrefix === props.defaultAiPrefix
                                }
                                data-testid={`${props['data-testid']}-reset-button`}
                            >
                                Reset to default
                            </Button>
                            <ConfirmUnsavedChangesModal
                                visible={modalVisable}
                                setVisible={setModalVisable}
                                confirmHandler={handleResetClick}
                                confirmText="Reset"
                            />
                        </SpaceBetween>
                    }
                >
                    History Configuration
                </Header>
            }
            data-testid={props['data-testid']}
        >
            <SpaceBetween size="l">
                <FormField
                    label="Size of trailing history"
                    description="Select the number of conversation turns that should be included in the final prompt."
                    info={<InfoLink onFollow={() => props.setHelpPanelContent!(sizeOfTrailingHistoryInfoPanel)} />}
                    errorText={chatHistoryLengthError}
                    constraintText="Recommendation is to use an even number to prevent truncation of user messages."
                    data-testid={`${props['data-testid']}-history-length-field`}
                >
                    <Input
                        type="number"
                        onChange={({ detail }) => handleChatHistoryLengthChange(detail)}
                        value={props.chatHistoryLength?.toString()}
                        name="history-length"
                        data-testid={`${props['data-testid']}-history-length-input`}
                    />
                </FormField>

                {shouldShowPrefixFields() && (
                    <>
                        <FormField
                            label="Human Prefix"
                            description="The prefix used in the history for messages sent by the user."
                            info={<InfoLink onFollow={() => props.setHelpPanelContent!(humanPrefixInfoPanel)} />}
                            errorText={humanPrefixError}
                            data-testid={`${props['data-testid']}-human-prefix-field`}
                        >
                            <Input
                                onChange={({ detail }) => handleHumanPrefixChange(detail)}
                                value={props.humanPrefix?.toString()}
                                name="human-prefix"
                                disabled={arePrefixFieldsDisabled()}
                                data-testid={`${props['data-testid']}-human-prefix-input`}
                            />
                        </FormField>

                        <FormField
                            label="AI Prefix"
                            description="The prefix used in the history for messages returned by the LLM."
                            info={<InfoLink onFollow={() => props.setHelpPanelContent!(aiPrefixInfoPanel)} />}
                            errorText={aiPrefixError}
                            data-testid={`${props['data-testid']}-ai-prefix-field`}
                        >
                            <Input
                                onChange={({ detail }) => handleAiPrefixChange(detail)}
                                value={props.aiPrefix?.toString()}
                                name="ai-prefix"
                                disabled={arePrefixFieldsDisabled()}
                                data-testid={`${props['data-testid']}-ai-prefix-input`}
                            />
                        </FormField>
                    </>
                )}
            </SpaceBetween>
        </Container>
    );
};

export default PromptHistoryConfiguration;

const validateUserInputNumber = (userInput: number): string => {
    let error = '';
    if (!Number.isInteger(userInput)) {
        error = 'Must be a whole number. Can only include characters 0-9.';
    } else if (userInput < 0) {
        error = 'Number must be greater than or equal to 0';
    }

    return error;
};

const validateUserInputPrefix = (userInput: string): string => {
    let error = '';
    if (userInput === '') {
        error = 'Prefix must have a length greater than 0.';
    }

    return error;
};

const sizeOfTrailingHistoryInfoPanel = {
    title: 'Size of trailing history',
    content: (
        <div>
            <Box variant="p">
                This setting is used to control how many of the previous messages in the conversation will be added to
                the prompt when replacing the{' '}
                <b>
                    <i>{'{history}'}</i>
                </b>{' '}
                placeholder.
            </Box>
            <Box variant="p">
                Setting this value to zero would result in no history being injected into either the prompt template or
                the disambiguation prompt template. <b>Please note:</b> even when set to zero a
                <b>
                    <i> {'{history}'}</i>
                </b>{' '}
                placeholder is still required to exist in the prompt templates. At runtime, it will get replaced with an
                empty string.
            </Box>
            <Box variant="p">
                <i>
                    Note: recommendation is to provide an even number for this value. Providing an odd number would
                    result in only the AI response of a user/AI interaction pair being returned.
                </i>
            </Box>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.TIPS_PROMPT_LIMITS,
            text: 'Tips for managing prompt limits'
        }
    ]
};

const humanPrefixInfoPanel = {
    title: 'Human prefix in history',
    content: (
        <div>
            <Box variant="p">
                This setting is used to control the prefix to use when injecting past <b>user input</b> into the prompt
                as history.
            </Box>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.TIPS_PROMPT_LIMITS,
            text: 'Tips for managing prompt limits'
        }
    ]
};

const aiPrefixInfoPanel = {
    title: 'AI prefix in history',
    content: (
        <div>
            <Box variant="p">
                This setting is used to control the prefix to use when injecting past <b>model responses</b> into the
                prompt as history.
            </Box>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.CONFIGURE_PROMPTS,
            text: 'Configuring your prompts'
        },
        {
            href: IG_DOCS.TIPS_PROMPT_LIMITS,
            text: 'Tips for managing prompt limits'
        }
    ]
};