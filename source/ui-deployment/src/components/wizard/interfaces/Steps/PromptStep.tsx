// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { DEFAULT_STEP_INFO } from '../../steps-config';
import { StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import Prompt from '../../Prompt';
import { mapPromptStepInfoFromDeployment } from '../../utils';

export interface PromptSettings extends BaseWizardProps {
    maxPromptTemplateLength: string | undefined;
    maxInputTextLength: number | undefined;
    promptTemplate: string | undefined;
    rephraseQuestion: boolean | undefined;
    userPromptEditingEnabled: boolean | undefined;
    chatHistoryLength: number | undefined;
    humanPrefix: string | undefined;
    aiPrefix: string | undefined;
    disambiguationEnabled: boolean | undefined;
    disambiguationPromptTemplate: string | undefined;
}
export class PromptStep extends BaseWizardStep {
    public id: string = 'prompt';
    public title: string = 'Select prompt';

    public props: PromptSettings = {
        maxPromptTemplateLength: DEFAULT_STEP_INFO.prompt.maxPromptTemplateLength,
        maxInputTextLength: DEFAULT_STEP_INFO.prompt.maxInputTextLength,
        promptTemplate: DEFAULT_STEP_INFO.prompt.promptTemplate,
        rephraseQuestion: DEFAULT_STEP_INFO.prompt.rephraseQuestion,
        userPromptEditingEnabled: DEFAULT_STEP_INFO.prompt.userPromptEditingEnabled,
        chatHistoryLength: DEFAULT_STEP_INFO.prompt.chatHistoryLength,
        humanPrefix: DEFAULT_STEP_INFO.prompt.humanPrefix,
        aiPrefix: DEFAULT_STEP_INFO.prompt.aiPrefix,
        disambiguationEnabled: DEFAULT_STEP_INFO.prompt.disambiguationEnabled,
        disambiguationPromptTemplate: DEFAULT_STEP_INFO.prompt.disambiguationPromptTemplate,
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Prompt selection',
        content: <Box variant="p">Use this page to configure the prompt used by the deployment.</Box>,
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

    public contentGenerator: (props: StepContentProps) => JSX.Element = (props: StepContentProps) => {
        return <Prompt {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {
        ({
            maxPromptTemplateLength: this.props.maxPromptTemplateLength,
            maxInputTextLength: this.props.maxInputTextLength,
            promptTemplate: this.props.promptTemplate,
            rephraseQuestion: this.props.rephraseQuestion,
            userPromptEditingEnabled: this.props.userPromptEditingEnabled,
            chatHistoryLength: this.props.chatHistoryLength,
            humanPrefix: this.props.humanPrefix,
            aiPrefix: this.props.aiPrefix,
            disambiguationEnabled: this.props.disambiguationEnabled,
            disambiguationPromptTemplate: this.props.disambiguationPromptTemplate,
            inError: this.props.inError
        } = mapPromptStepInfoFromDeployment(selectedDeployment));
    };
}
