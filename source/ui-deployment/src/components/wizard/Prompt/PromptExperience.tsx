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
import UserPromptEditingEnabledToggle from './UserPromptEditingEnabledToggle';

export interface PromptExperienceProps extends BaseFormComponentProps {
    defaultMaxPromptTemplateLength?: number;
    maxPromptTemplateLength: number;
    defaultMaxInputTextLength?: number;
    maxInputTextLength: number;
    userPromptEditingEnabled: boolean;
    setPromptExperienceInError: React.Dispatch<React.SetStateAction<boolean>>;
    'data-testid'?: string;
}

export const PromptExperience = (props: PromptExperienceProps) => {
    const [modalVisable, setModalVisable] = React.useState(false);
    let maxPromptTemplateLengthError = validateUserInputNumber(props.maxPromptTemplateLength);
    let maxInputTextLengthError = validateUserInputNumber(props.maxInputTextLength);

    //propagate error to parent component on any changes to the error messages
    React.useEffect(() => {
        props.setPromptExperienceInError(maxPromptTemplateLengthError.length > 0 || maxInputTextLengthError.length > 0);
    }, [maxPromptTemplateLengthError, maxInputTextLengthError]);

    const handleMaxPromptTemplateLengthChange = (detail: InputProps.ChangeDetail) => {
        const userInput: number = parseFloat(detail.value);
        maxPromptTemplateLengthError = validateUserInputNumber(userInput);

        props.onChangeFn({ maxPromptTemplateLength: userInput });
    };

    const handleMaxInputTextLengthChange = (detail: InputProps.ChangeDetail) => {
        const userInput: number = parseFloat(detail.value);
        maxInputTextLengthError = validateUserInputNumber(userInput);

        props.onChangeFn({ maxInputTextLength: userInput });
    };

    const handleResetClick = () => {
        props.onChangeFn({
            maxPromptTemplateLength: props.defaultMaxPromptTemplateLength,
            maxInputTextLength: props.defaultMaxInputTextLength
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
                                    props.maxPromptTemplateLength === props.defaultMaxPromptTemplateLength &&
                                    props.maxInputTextLength === props.defaultMaxInputTextLength
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
                    Prompt Experience
                </Header>
            }
            data-testid={props['data-testid']}
        >
            <SpaceBetween size="l">
                <FormField
                    label="Max prompt template length"
                    info={
                        <InfoLink
                            onFollow={() => props.setHelpPanelContent!(maxPromptLengthInfoPanel)}
                            ariaLabel={'Max supported size of prompt template'}
                        />
                    }
                    errorText={maxPromptTemplateLengthError}
                >
                    <Input
                        type="number"
                        onChange={({ detail }) => handleMaxPromptTemplateLengthChange(detail)}
                        value={props.maxPromptTemplateLength?.toString()}
                    />
                </FormField>

                <FormField
                    label="Max input text length"
                    info={
                        <InfoLink
                            onFollow={() => props.setHelpPanelContent!(maxInputLengthInfoPanel)}
                            ariaLabel={'Max supported length of chat input text'}
                        />
                    }
                    errorText={maxInputTextLengthError}
                >
                    <Input
                        type="number"
                        onChange={({ detail }) => handleMaxInputTextLengthChange(detail)}
                        value={(props.maxInputTextLength ?? props.defaultMaxInputTextLength)?.toString()}
                        autoComplete={false}
                    />
                </FormField>
                <UserPromptEditingEnabledToggle
                    userPromptEditingEnabled={props.userPromptEditingEnabled}
                    onChangeFn={props.onChangeFn}
                    setHelpPanelContent={props.setHelpPanelContent}
                />
            </SpaceBetween>
        </Container>
    );
};

export default PromptExperience;

const validateUserInputNumber = (userInput: number) => {
    let error = '';
    if (!Number.isInteger(userInput)) {
        error = 'Must be a whole number. Can only include characters 0-9.';
    } else if (userInput <= 0) {
        error = 'Number must be greater than 0';
    }

    return error;
};

const maxPromptLengthInfoPanel = {
    title: 'Max prompt template length',
    content: (
        <div>
            <Box variant="p">
                This setting is used to control the maximum number characters supported within the{' '}
                <b>prompt template</b>
            </Box>
            <Box variant="p">
                <i>
                    Note: this is not the same as the final prompt sent the model. What's sent to the model is a
                    completed <b>prompt template</b>, which includes additional components such as the user input,
                    document <b>context</b>. etc.
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

const maxInputLengthInfoPanel = {
    title: 'Max input length',
    content: (
        <div>
            <Box variant="p">
                This setting is used to control the maximum number characters supported as <b>user input</b> to the chat
                ui.
            </Box>
            <Box variant="p">
                <i>
                    Note: this is not the same as the final prompt sent the model. What's sent to the model is a
                    completed <b>prompt template</b>, which the user input is just one component of.
                </i>
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
