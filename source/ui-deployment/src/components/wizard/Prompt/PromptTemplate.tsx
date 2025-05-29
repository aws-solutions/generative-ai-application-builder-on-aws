// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
    Box,
    Button,
    Container,
    FormField,
    Header,
    InputProps,
    SpaceBetween,
    Textarea,
    Toggle
} from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../interfaces';
import { InfoLink } from '@/components/commons';
import { IG_DOCS } from '@/utils/constants';
import { ConfirmUnsavedChangesModal } from '@/components/commons/confirm-unsaved-changes-modal';
import { MODEL_PROVIDER_NAME_MAP } from '../steps-config';

export interface PromptExperienceProps extends BaseFormComponentProps {
    defaultPromptTemplate?: string;
    promptTemplate: string;
    maxPromptTemplateLength: number;
    rephraseQuestion: boolean;
    disambiguationEnabled: boolean;
    isRag: boolean;
    modelProvider: string;
    setPromptTemplateInError: React.Dispatch<React.SetStateAction<boolean>>;
    'data-testid'?: string;
}

export const PromptTemplate = (props: PromptExperienceProps) => {
    const [modalVisable, setModalVisable] = React.useState(false);
    let promptTemplateError = validateUserPromptInput(
        props.promptTemplate,
        props.isRag,
        props.maxPromptTemplateLength,
        props.modelProvider
    );

    //propagate error to parent component on any changes to the error messages
    React.useEffect(() => {
        props.setPromptTemplateInError(promptTemplateError.length > 0);
    }, [promptTemplateError]);

    const handlePromptTemplateChange = (detail: InputProps.ChangeDetail) => {
        const userInput: string = detail.value;
        promptTemplateError = validateUserPromptInput(
            userInput,
            props.isRag,
            props.maxPromptTemplateLength,
            props.modelProvider
        );

        props.onChangeFn({ promptTemplate: userInput });
    };

    const handleResetClick = () => {
        props.onChangeFn({
            promptTemplate: props.defaultPromptTemplate
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
                                disabled={props.promptTemplate === props.defaultPromptTemplate}
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
                    System Prompt Template
                </Header>
            }
            data-testid={props['data-testid']}
        >
            <SpaceBetween size="l">
                <FormField
                    label="System Prompt Template"
                    info={<InfoLink onFollow={() => props.setHelpPanelContent!(promptTemplateInfoPanel)} />}
                    errorText={promptTemplateError}
                    stretch={true}
                >
                    <Textarea
                        rows={20}
                        onChange={({ detail }) => handlePromptTemplateChange(detail)}
                        value={props.promptTemplate}
                        placeholder={getPromptTemplatePlaceholderText(props.isRag)}
                        spellcheck={true}
                    />
                </FormField>

                {props.isRag && (
                    <FormField
                        label="Rephrase Question?"
                        description="If checked, the placeholder {input} will be replaced with the disambiguated query instead of the original user input."
                        info={<InfoLink onFollow={() => props.setHelpPanelContent!(promptTemplateInfoPanel)} />}
                        warningText={
                            !props.disambiguationEnabled ? 'Can only be used when disambiguation is enabled' : ''
                        }
                        data-testid={`${props['data-testid']}-rephrase-question-formfield`}
                    >
                        <Toggle
                            onChange={({ detail }) => props.onChangeFn({ rephraseQuestion: detail.checked })}
                            checked={props.rephraseQuestion}
                            disabled={!props.disambiguationEnabled}
                        />
                    </FormField>
                )}
            </SpaceBetween>
        </Container>
    );
};

export default PromptTemplate;

/**
 * Validates the user-provided prompt template to ensure it meets the required criteria.
 * @param promptTemplate - The template string to validate
 * @param isRag - Whether RAG mode is enabled
 * @param maxPromptLength - Maximum allowed length of the template
 * @param modelProvider - The model provider being used
 * @returns Error message string if validation fails, empty string if valid
 */
const validateUserPromptInput = (
    promptTemplate: string,
    isRag: boolean,
    maxPromptLength: number,
    modelProvider?: string
): string => {
    if (!promptTemplate) {
        return 'Enter a valid system prompt template';
    }

    const validationResult = validatePromptLength(promptTemplate, maxPromptLength);
    if (validationResult) return validationResult;

    const { requiredPlaceholders, placeholderError } = getRequiredPlaceholders(modelProvider, isRag, promptTemplate);
    if (placeholderError) return placeholderError;

    const placeholderValidationError = validatePlaceholders(
        promptTemplate,
        isRag ? requiredPlaceholders.rag : requiredPlaceholders.base
    );
    if (placeholderValidationError) return placeholderValidationError;

    return checkPromptIsEscaped(promptTemplate, isRag ? requiredPlaceholders.rag : requiredPlaceholders.base);
};

/**
 * Validates the prompt template length
 */
const validatePromptLength = (promptTemplate: string, maxLength: number): string => {
    if (promptTemplate.length > maxLength) {
        return `The system prompt template has too many characters. Character count: ${promptTemplate.length}/${maxLength}`;
    }
    return '';
};

/**
 * Determines required placeholders and validates unsupported ones based on model provider
 */
const getRequiredPlaceholders = (modelProvider: string | undefined, isRag: boolean, promptTemplate: string) => {
    const result = {
        requiredPlaceholders: {
            base: [] as string[],
            rag: [] as string[]
        },
        placeholderError: ''
    };

    if (modelProvider === MODEL_PROVIDER_NAME_MAP.SageMaker) {
        result.requiredPlaceholders.base = ['{input}', '{history}'];
        result.requiredPlaceholders.rag = ['{input}', '{history}', '{context}'];
        return result;
    }

    result.requiredPlaceholders.base = [];
    result.requiredPlaceholders.rag = ['{context}'];

    if (promptTemplate.includes('{history}')) {
        result.placeholderError = `Remove unsupported placeholder '{history}'. The '{history}' placeholder is no longer used and message history will now be automatically added after the system prompt and before the latest user input. See info panel for help or reset prompt template to default.`;
    } else if (promptTemplate.includes('{input}')) {
        result.placeholderError = `Remove unsupported placeholder '{input}'. The {input} placeholder is no longer used and will now be automatically added as the last message in the prompt.`;
    }

    return result;
};

/**
 * Validates that all required placeholders are present exactly once
 */
const validatePlaceholders = (promptTemplate: string, requiredPlaceholders: string[]): string => {
    for (const placeholder of requiredPlaceholders) {
        if (!promptTemplate.includes(placeholder)) {
            return `Missing required placeholder '${placeholder}'. See info panel for help or reset prompt template to default.`;
        }

        if (promptTemplate.indexOf(placeholder) !== promptTemplate.lastIndexOf(placeholder)) {
            return `Placeholder '${placeholder}' should appear only once in the prompt template. See info panel for help or reset prompt template to default.`;
        }
    }
    return '';
};

const checkPromptIsEscaped = (promptTemplate: string, requiredPlaceholders: Array<string>): string => {
    // removes all the placeholders, which are valid uses of unescaped curly braces
    requiredPlaceholders.forEach((placeholder) => {
        promptTemplate = promptTemplate.replace(placeholder, '');
    });

    // ensure both types of braces are escaped (doubled), per langchain standards
    const escapableCharacters = ['{', '}'];
    for (const char of escapableCharacters) {
        let index = 0;
        while (index < promptTemplate.length) {
            const charIndex = promptTemplate.indexOf(char, index);

            if (charIndex === -1) {
                // No more curly braces found
                break;
            }

            // is it escaped by doubling?
            if (promptTemplate.charAt(charIndex + 1) !== char) {
                return `Prompt template contains an unescaped curly brace '${char}'. To use literal curly braces in your template, please double them: '${char}${char}' instead of '${char}'.`;
            } else {
                index = charIndex + 2;
            }
        }
    }
    return '';
};

//show basic prompt structure as a placeholder when the prompt template component is empty
const getPromptTemplatePlaceholderText = (isRag: boolean): string => {
    if (isRag) {
        return `Here are your instructions for this conversation.

Here are the reference texts:
{context}

Here is the history:
{history}

Here is the user input: {input}`;
    }

    return `Here are your instructions for this conversation.

Here is the history:
{history}

Here is the user input: {input}`;
};

const promptTemplateInfoPanel = {
    title: 'System Prompt Template',
    content: (
        <div>
            <Box>
                Prompts are a great way to customize and control the response behaviour of an LLM. Here are the
                placeholders available for use in your template:
                <ul>
                    <li>
                        <b>{'{input}'}</b> - <i>Mandatory</i> - this placeholder will be substituted with the chat
                        user's input message.{' '}
                        <i>
                            Note: in the case of a RAG deployment the default behaviour is that the disambiguated query
                            is used. This can be controlled using the <b>Rephrase Question</b> toggle.
                        </i>
                    </li>
                    <li>
                        <b>{'{history}'}</b> - <i>Mandatory</i> - this placeholder will be substituted with the chat
                        history of the session
                    </li>
                    <li>
                        <b>{'{context}'}</b> - <i>Mandatory (RAG only)</i> - this placeholder will be substituted with
                        the document excerpts obtained from the configured knowledge base
                    </li>
                </ul>
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
