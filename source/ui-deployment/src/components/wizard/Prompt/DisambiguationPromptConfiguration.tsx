import React, { useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    FormField,
    Header,
    InputProps,
    RadioGroup,
    SpaceBetween,
    Textarea
} from '@cloudscape-design/components';
import { IG_DOCS } from '@/utils/constants';
import { InfoLink } from '@/components/commons';
import { BaseFormComponentProps } from '../interfaces';
import { ConfirmUnsavedChangesModal } from '@/components/commons/confirm-unsaved-changes-modal';

export interface DisambiguationPromptConfigurationProps extends BaseFormComponentProps {
    disambiguationEnabled: boolean;
    defaultDisambiguationPromptTemplate: string;
    disambiguationPromptTemplate: string;
    maxPromptTemplateLength: number;
    setDisambiguationPromptInError: React.Dispatch<React.SetStateAction<boolean>>;
    'data-testid'?: string;
}

export const DisambiguationPromptConfiguration = (props: DisambiguationPromptConfigurationProps) => {
    const [modalVisible, setModalVisible] = React.useState(false);
    let disambiguationPromptError = validateDisambiguationPrompt(
        props.disambiguationPromptTemplate,
        props.maxPromptTemplateLength
    );

    useEffect(() => {
        props.setDisambiguationPromptInError(disambiguationPromptError.length > 0);
    }, [disambiguationPromptError]);

    const handleDisambiguationEnabledChange = (enabledString: string) => {
        //Radio group values must be string, so need to compare strings instead of using bools
        if (enabledString === 'true') {
            props.onChangeFn({ disambiguationEnabled: true });
        } else if (enabledString === 'false') {
            props.onChangeFn({ disambiguationEnabled: false });
        }
    };

    const handleDisambiguationPromptChange = (detail: InputProps.ChangeDetail) => {
        const userInput = detail.value;
        disambiguationPromptError = validateDisambiguationPrompt(userInput, props.maxPromptTemplateLength);
        props.onChangeFn({ disambiguationPromptTemplate: userInput });
    };

    const handleResetClick = () => {
        props.onChangeFn({ disambiguationPromptTemplate: props.defaultDisambiguationPromptTemplate });
        setModalVisible(false);
    };

    return (
        <Container
            header={
                <Header
                    actions={
                        <SpaceBetween size="l">
                            <Button
                                variant="normal"
                                onClick={() => setModalVisible(true)}
                                disabled={
                                    props.disambiguationPromptTemplate === props.defaultDisambiguationPromptTemplate
                                }
                            >
                                Reset to default
                            </Button>
                            <ConfirmUnsavedChangesModal
                                visible={modalVisible}
                                setVisible={setModalVisible}
                                confirmHandler={handleResetClick}
                                confirmText="Reset"
                            />
                        </SpaceBetween>
                    }
                >
                    Disambiguation Prompt Configuration
                </Header>
            }
            data-testid={props['data-testid']}
        >
            <SpaceBetween size="l">
                <FormField
                    label="Enable Disambiguation"
                    description="Whether or not to disambiguate user inputs before sending to the configured knowledge base."
                    info={
                        <InfoLink onFollow={() => props.setHelpPanelContent!(disambiguationPromptTemplateInfoPanel)} />
                    }
                >
                    <RadioGroup
                        onChange={({ detail }) => {
                            handleDisambiguationEnabledChange(detail.value);
                        }}
                        value={props.disambiguationEnabled?.toString()}
                        items={[
                            { value: 'true', label: 'Yes' },
                            { value: 'false', label: 'No' }
                        ]}
                    ></RadioGroup>
                </FormField>

                <FormField
                    label="Disambiguation Prompt Template"
                    description="The prompt template to use when disambiguating user inputs before sending to the configured knowledge base."
                    info={
                        <InfoLink onFollow={() => props.setHelpPanelContent!(disambiguationPromptTemplateInfoPanel)} />
                    }
                    errorText={disambiguationPromptError}
                    stretch={true}
                >
                    <Textarea
                        rows={20}
                        onChange={({ detail }) => handleDisambiguationPromptChange(detail)}
                        value={props.disambiguationPromptTemplate}
                        disabled={!props.disambiguationEnabled}
                        spellcheck={true}
                    />
                </FormField>
            </SpaceBetween>
        </Container>
    );
};

//validates the user-provided prompt template to ensure it meets the required criteria.
const validateDisambiguationPrompt = (promptTemplate: string, maxPromptLength: number): string => {
    let error = '';
    const requiredPlaceholders = ['{input}', '{history}'];

    if (!promptTemplate) {
        return 'Enter a valid prompt template';
    }

    if (promptTemplate.length > maxPromptLength) {
        return `The prompt template has too many characters. Character count: ${promptTemplate.length}/${maxPromptLength}`;
    }

    for (const placeholder of requiredPlaceholders) {
        if (!promptTemplate.includes(placeholder)) {
            return `Missing required placeholder '${placeholder}'. See info panel for help or reset prompt template to default.`;
        }

        //placeholder should exist only once in promptTemplate
        if (promptTemplate.indexOf(placeholder) !== promptTemplate.lastIndexOf(placeholder)) {
            return `Placeholder '${placeholder}' should appear only once in the prompt template. See info panel for help or reset prompt template to default.`;
        }
    }

    return error;
};

const disambiguationPromptTemplateInfoPanel = {
    title: 'Disambiguation Prompt Template',
    content: (
        <div>
            <Box variant="p">
                When connected to a knowledge base, it is recommended to use a <b>disambiguation prompt</b> to convert
                the user's raw input into a standalone question. The output generated from this prompt will be used as
                the query sent to the knowledge base. Disabling disambiguation would result in the user's raw query
                being sent to the knowledge base unchanged.
            </Box>
            <Box variant="p">
                For example, with disambiguation enabled, a follow up user query of <i>"How much does it cost"</i>,
                might be disambiguated to <i>"How much does it cost to renew my license plate"</i>, leading to a better
                search query.
            </Box>
            <Box variant="p">
                Prompts are a great way to customize and control the response behaviour of an LLM. Here are the
                placeholders available for use in your template:
                <ul>
                    <li>
                        <b>{'{input}'}</b> - <i>Mandatory</i> - this placeholder will be substituted with the chat
                        user's input message
                    </li>
                    <li>
                        <b>{'{history}'}</b> - <i>Mandatory</i> - this placeholder will be substituted with the chat
                        history of the session
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

export default DisambiguationPromptConfiguration;
