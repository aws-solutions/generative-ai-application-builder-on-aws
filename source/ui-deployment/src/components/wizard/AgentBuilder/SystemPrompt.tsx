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
    Textarea
} from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../interfaces';
import { InfoLink } from '@/components/commons';
import { IG_DOCS, MAX_AGENT_SYSTEM_PROMPT_LENGTH, DEFAULT_AGENT_SYSTEM_PROMPT } from '@/utils/constants';
import { ConfirmUnsavedChangesModal } from '@/components/commons/confirm-unsaved-changes-modal';

export interface SystemPromptProps extends BaseFormComponentProps {
    defaultSystemPrompt?: string;
    systemPrompt: string;
    setNumFieldsInError: React.Dispatch<React.SetStateAction<number>>;
    setSystemPromptInError: React.Dispatch<React.SetStateAction<boolean>>;
    headerTitle?: string;
    'data-testid'?: string;
}

export const SystemPrompt = (props: SystemPromptProps) => {
    const [modalVisible, setModalVisible] = React.useState(false);

    const validateSystemPrompt = (prompt: string): string => {
        if (!prompt || prompt.trim().length === 0) {
            return 'System prompt is required';
        }

        if (prompt.length > MAX_AGENT_SYSTEM_PROMPT_LENGTH) {
            return `System prompt is too long. Character count: ${prompt.length}/${MAX_AGENT_SYSTEM_PROMPT_LENGTH}`;
        }

        return '';
    };

    const promptError = validateSystemPrompt(props.systemPrompt);

    // Propagate error to parent component on any changes to the error messages
    React.useEffect(() => {
        props.setSystemPromptInError(promptError.length > 0);
    }, [promptError]);

    const handleSystemPromptChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ systemPrompt: detail.value });
    };

    const handleResetClick = () => {
        props.onChangeFn({ systemPrompt: props.defaultSystemPrompt });
        setModalVisible(false);
    };

    return (
        <Container
            header={
                <Header
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button
                                variant="normal"
                                onClick={() => setModalVisible(true)}
                                disabled={props.systemPrompt === props.defaultSystemPrompt}
                                data-testid="system-prompt-reset-button"
                            >
                                Reset to default
                            </Button>
                            <ConfirmUnsavedChangesModal
                                visible={modalVisible}
                                setVisible={setModalVisible}
                                confirmHandler={handleResetClick}
                                confirmText="Reset"
                                data-testid="system-prompt-reset-modal"
                            />
                        </SpaceBetween>
                    }
                    data-testid="system-prompt-header"
                >
                    {props.headerTitle ?? 'Prompt'}
                </Header>
            }
            data-testid={props['data-testid']}
        >
            <SpaceBetween size="l">
                <FormField
                    label="System Prompt"
                    info={
                        <InfoLink
                            onFollow={() => props.setHelpPanelContent!(systemPromptInfoPanel)}
                            data-testid="system-prompt-info-link"
                        />
                    }
                    errorText={promptError}
                    stretch={true}
                    description="Define the behavior and personality of your AI agent. This prompt will guide how the agent responds to user interactions."
                    data-testid="system-prompt-form-field"
                >
                    <Textarea
                        rows={15}
                        onChange={({ detail }) => handleSystemPromptChange(detail)}
                        value={props.systemPrompt}
                        placeholder="Enter your system prompt here..."
                        spellcheck={true}
                        data-testid="system-prompt-textarea"
                    />
                </FormField>
            </SpaceBetween>
        </Container>
    );
};

export default SystemPrompt;

const systemPromptInfoPanel = {
    title: 'System Prompt',
    content: (
        <div>
            <Box>
                The system prompt defines your AI agent's behavior, personality, and capabilities. It serves as the
                foundational instruction that guides how your agent will interact with users.
            </Box>
            <Box variant="h4">Best Practices:</Box>
            <ul>
                <li>
                    <b>Be specific:</b> Clearly define the agent's role and responsibilities
                </li>
                <li>
                    <b>Set boundaries:</b> Specify what the agent should and shouldn't do
                </li>
                <li>
                    <b>Define tone:</b> Establish the communication style (professional, friendly, etc.)
                </li>
                <li>
                    <b>Include context:</b> Provide relevant background information if needed
                </li>
                <li>
                    <b>Keep it focused:</b> Avoid overly complex or contradictory instructions
                </li>
            </ul>
            <Box variant="h4">Example Elements:</Box>
            <ul>
                <li>Role definition (e.g., "You are a customer service assistant")</li>
                <li>Behavioral guidelines (e.g., "Always be polite and helpful")</li>
                <li>Task-specific instructions (e.g., "Help users with product information")</li>
                <li>Limitations (e.g., "Don't provide medical advice")</li>
            </ul>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.CONFIGURE_PROMPTS,
            text: 'Configuring your prompts'
        },
        {
            href: IG_DOCS.AGENT_USE_CASE,
            text: 'Agent use case documentation'
        }
    ]
};
