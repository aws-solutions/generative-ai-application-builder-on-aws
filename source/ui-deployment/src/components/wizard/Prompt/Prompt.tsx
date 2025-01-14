// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { ExpandableSection, SpaceBetween, Spinner } from '@cloudscape-design/components';
import { StepContentProps } from '../interfaces/Steps';

import PromptExperience from './PromptExperience';
import PromptTemplate from './PromptTemplate';
import { useModelInfoQuery } from '@/hooks/useQueries';
import PromptHistoryConfiguration from './PromptHistoryConfiguration';
import DisambiguationPromptConfiguration from './DisambiguationPromptConfiguration';
import {
    DEFAULT_CHAT_HISTORY_LENGTH,
    DEFAULT_DISAMBIGUATION_PROMPT_ENABLED,
    DEFAULT_REPHRASE_QUESTION_STATE
} from '@/utils/constants';

const Prompt = ({ info: { model, knowledgeBase, prompt }, setHelpPanelContent, onChange }: StepContentProps) => {
    //setNumFiedsInError isn't actually used by the components, but must be passed in due to extended interface
    const [, setNumFieldsInError] = React.useState(0);

    //Prompt Experience states
    const [defaultMaxPromptTemplateLength, setDefaultMaxPromptTemplateLength] = React.useState(0);
    const [defaultMaxInputTextLength, setDefaultMaxInputTextLength] = React.useState(0);
    const [promptExperienceInError, setPromptExperienceInError] = React.useState(false);
    const setPromptExperienceDefaults = (prompt: any, onChange: any, modelInfo: any) => {
        setDefaultMaxPromptTemplateLength(modelInfo.MaxPromptSize);
        setDefaultMaxInputTextLength(modelInfo.MaxChatMessageSize);

        if (prompt.maxPromptTemplateLength === undefined) {
            onChange({ maxPromptTemplateLength: modelInfo.MaxPromptSize });
        }
        if (prompt.maxInputTextLength === undefined) {
            onChange({ maxInputTextLength: modelInfo.MaxChatMessageSize });
        }
    };

    //Prompt Template states
    const [defaultPromptTemplate, setDefaultPromptTemplate] = React.useState('');
    const [promptTemplateInError, setPromptTemplateInError] = React.useState(false);
    const setPromptTemplateDefaults = (prompt: any, onChange: any, modelInfo: any) => {
        setDefaultPromptTemplate(modelInfo.Prompt);

        if (prompt.promptTemplate === undefined) {
            onChange({ promptTemplate: modelInfo.Prompt });
        }

        if (prompt.rephraseQuestion === undefined) {
            onChange({ rephraseQuestion: DEFAULT_REPHRASE_QUESTION_STATE });
        }
    };

    //History Configuration states
    //default chat history length doesn't exist within model-info at this time. Use constant default value for now
    const defaultChatHistoryLengthPlaceholder = DEFAULT_CHAT_HISTORY_LENGTH;
    const [defaultChatHistoryLength, setDefaultChatHistoryLength] = React.useState(defaultChatHistoryLengthPlaceholder);
    const [defaultHumanPrefix, setDefaultHumanPrefix] = React.useState('');
    const [defaultAiPrefix, setDefaultAiPrefix] = React.useState('');
    const [historyConfigurationInError, setHistoryConfigurationInError] = React.useState(false);
    const setHistoryConfigurationDefaults = (prompt: any, onChange: any, modelInfo: any) => {
        setDefaultChatHistoryLength(defaultChatHistoryLengthPlaceholder);
        setDefaultHumanPrefix(modelInfo.MemoryConfig.human_prefix);
        setDefaultAiPrefix(modelInfo.MemoryConfig.ai_prefix);

        if (prompt.chatHistoryLength === undefined) {
            onChange({ chatHistoryLength: defaultChatHistoryLengthPlaceholder });
        }
        if (prompt.humanPrefix === undefined) {
            onChange({ humanPrefix: modelInfo.MemoryConfig.human_prefix });
        }
        if (prompt.aiPrefix === undefined) {
            onChange({ aiPrefix: modelInfo.MemoryConfig.ai_prefix });
        }
    };

    //Disambiguation Configuration states
    const [defaultDisambiguationPromptTemplate, setDefaultDisambiguationPromptTemplate] = React.useState('');
    const [disambiguationPromptInError, setDisambiguationPromptInError] = React.useState(false);
    const setDisambiguationConfigurationDefaults = (knowledgeBase: any, prompt: any, onChange: any, modelInfo: any) => {
        setDefaultDisambiguationPromptTemplate(modelInfo.DisambiguationPrompt);

        // only bother setting the disambiguation to the default if RAG is enabled
        if (knowledgeBase.isRagRequired && prompt.disambiguationEnabled === undefined) {
            onChange({ disambiguationEnabled: DEFAULT_DISAMBIGUATION_PROMPT_ENABLED });
        }
        if (knowledgeBase.isRagRequired && prompt.disambiguationPromptTemplate === undefined) {
            onChange({ disambiguationPromptTemplate: modelInfo.DisambiguationPrompt });
        }
    };

    //additional states for flow control
    const [isLoading, setIsLoading] = React.useState(true);
    const [advancedSettingsIsExpanded, setAdvancedSettingsIsExpanded] = React.useState(true);

    const modelDefaultsQueryResponse = useModelInfoQuery(
        model.modelProvider.value,
        model.modelName,
        knowledgeBase.isRagRequired ? 'RAGChat' : 'Chat'
    );

    //set the global error state of this wizard step based on errors propogated from sub components
    React.useEffect(() => {
        onChange({
            inError:
                promptExperienceInError ||
                promptTemplateInError ||
                historyConfigurationInError ||
                disambiguationPromptInError
        });
    }, [promptExperienceInError, promptTemplateInError, historyConfigurationInError, disambiguationPromptInError]);

    //call model infos API to fetch default prompt values
    React.useEffect(() => {
        if (modelDefaultsQueryResponse.isError) {
            console.error('Error in fetching model defaults');
        }

        if (modelDefaultsQueryResponse.isSuccess) {
            const modelInfo = modelDefaultsQueryResponse.data;

            //set default values for all sub components so that we can support a "Reset to default" button
            //and if any of the props are undefined, then set to default value so that value is included in the API call
            setPromptExperienceDefaults(prompt, onChange, modelInfo);
            setPromptTemplateDefaults(prompt, onChange, modelInfo);
            setHistoryConfigurationDefaults(prompt, onChange, modelInfo);
            setDisambiguationConfigurationDefaults(knowledgeBase, prompt, onChange, modelInfo);

            //now that we've fetched the defaults, set isLoading to false to render components
            setIsLoading(false);
        }
    }, [modelDefaultsQueryResponse.data, prompt]);

    //let's show a spinner until all data required for the components have been fetched
    if (isLoading) {
        return <Spinner size="large" data-testid="prompt-step-loading-spinner" />;
    }

    return (
        <SpaceBetween size="l">
            <PromptExperience
                defaultMaxPromptTemplateLength={defaultMaxPromptTemplateLength}
                maxPromptTemplateLength={prompt.maxPromptTemplateLength}
                defaultMaxInputTextLength={defaultMaxInputTextLength}
                maxInputTextLength={prompt.maxInputTextLength}
                userPromptEditingEnabled={prompt.userPromptEditingEnabled}
                onChangeFn={onChange}
                setHelpPanelContent={setHelpPanelContent}
                setNumFieldsInError={setNumFieldsInError}
                setPromptExperienceInError={setPromptExperienceInError}
                data-testid="prompt-step-prompt-experience-component"
            />

            <PromptTemplate
                defaultPromptTemplate={defaultPromptTemplate}
                promptTemplate={prompt.promptTemplate}
                maxPromptTemplateLength={prompt.maxPromptTemplateLength}
                rephraseQuestion={prompt.rephraseQuestion}
                disambiguationEnabled={prompt.disambiguationEnabled}
                onChangeFn={onChange}
                setHelpPanelContent={setHelpPanelContent}
                setNumFieldsInError={setNumFieldsInError}
                isRag={knowledgeBase.isRagRequired}
                setPromptTemplateInError={setPromptTemplateInError}
                data-testid="prompt-step-prompt-template-component"
            />

            <ExpandableSection
                variant="default"
                headerText="Advanced settings"
                expanded={advancedSettingsIsExpanded}
                onChange={({ detail }) => setAdvancedSettingsIsExpanded(detail.expanded)}
                headerDescription="Advanced settings used for greater control of how the final prompt is crafted. For initial experimentations, it's recommended to set these values to their defaults."
            >
                <SpaceBetween size="l">
                    <PromptHistoryConfiguration
                        defaultChatHistoryLength={defaultChatHistoryLength}
                        chatHistoryLength={prompt.chatHistoryLength}
                        defaultHumanPrefix={defaultHumanPrefix}
                        humanPrefix={prompt.humanPrefix}
                        defaultAiPrefix={defaultAiPrefix}
                        aiPrefix={prompt.aiPrefix}
                        onChangeFn={onChange}
                        setHelpPanelContent={setHelpPanelContent}
                        setNumFieldsInError={setNumFieldsInError}
                        setHistoryConfigurationInError={setHistoryConfigurationInError}
                        data-testid="prompt-step-history-configuration-component"
                    />

                    {knowledgeBase.isRagRequired && (
                        <DisambiguationPromptConfiguration
                            disambiguationEnabled={prompt.disambiguationEnabled}
                            defaultDisambiguationPromptTemplate={defaultDisambiguationPromptTemplate}
                            disambiguationPromptTemplate={prompt.disambiguationPromptTemplate}
                            maxPromptTemplateLength={prompt.maxPromptTemplateLength}
                            onChangeFn={onChange}
                            setHelpPanelContent={setHelpPanelContent}
                            setNumFieldsInError={setNumFieldsInError}
                            setDisambiguationPromptInError={setDisambiguationPromptInError}
                            data-testid="prompt-step-disambiguation-prompt-configuration-component"
                        />
                    )}
                </SpaceBetween>
            </ExpandableSection>
        </SpaceBetween>
    );
};

export default Prompt;
