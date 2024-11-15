/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

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

export interface PromptHistoryConfigurationProps extends BaseFormComponentProps {
    defaultChatHistoryLength?: number;
    chatHistoryLength: number;
    defaultHumanPrefix?: string;
    humanPrefix: string;
    defaultAiPrefix?: string;
    aiPrefix: string;
    setHistoryConfigurationInError: React.Dispatch<React.SetStateAction<boolean>>;
    'data-testid'?: string;
}

export const PromptHistoryConfiguration = (props: PromptHistoryConfigurationProps) => {
    const [modalVisable, setModalVisable] = React.useState(false);
    let chatHistoryLengthError = validateUserInputNumber(props.chatHistoryLength);
    let humanPrefixError = validateUserInputPrefix(props.humanPrefix);
    let aiPrefixError = validateUserInputPrefix(props.aiPrefix);

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
                >
                    <Input
                        type="number"
                        onChange={({ detail }) => handleChatHistoryLengthChange(detail)}
                        value={props.chatHistoryLength?.toString()}
                        name="history-length"
                    />
                </FormField>

                <FormField
                    label="Human Prefix"
                    description="The prefix used in the history for messages sent by the user."
                    info={<InfoLink onFollow={() => props.setHelpPanelContent!(humanPrefixInfoPanel)} />}
                    errorText={humanPrefixError}
                >
                    <Input
                        onChange={({ detail }) => handleHumanPrefixChange(detail)}
                        value={props.humanPrefix?.toString()}
                        name="human-prefix"
                    />
                </FormField>

                <FormField
                    label="AI Prefix"
                    description="The prefix used in the history for messages returned by the LLM."
                    info={<InfoLink onFollow={() => props.setHelpPanelContent!(aiPrefixInfoPanel)} />}
                    errorText={aiPrefixError}
                >
                    <Input
                        onChange={({ detail }) => handleAiPrefixChange(detail)}
                        value={props.aiPrefix?.toString()}
                        name="ai-prefix"
                    />
                </FormField>
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
