// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, ColumnLayout, SpaceBetween } from '@cloudscape-design/components';
import { useComponentId } from '../../commons/use-component-id';
import { getBooleanString } from '../../wizard/utils';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';
import { escapedNewLineToLineBreakTag } from '../../../utils/displayUtils';

export interface PromptDetailsProps {
    selectedDeployment: any;
}

export const PromptDetails = (props: PromptDetailsProps) => {
    let numberOfColumns: number;
    let promptDetailsContent: React.JSX.Element;
    if (props.selectedDeployment.LlmParams.RAGEnabled) {
        numberOfColumns = 3;
        promptDetailsContent = (
            <>
                {generatePromptExperienceContent(props.selectedDeployment)}
                {generatePromptHistoryContent(props.selectedDeployment)}
                {generateDisambiguationPromptContent(props.selectedDeployment)}
            </>
        );
    } else {
        numberOfColumns = 2;
        promptDetailsContent = (
            <>
                {generatePromptExperienceContent(props.selectedDeployment)}
                {generatePromptHistoryContent(props.selectedDeployment)}
            </>
        );
    }

    return (
        <ColumnLayout columns={numberOfColumns} variant="text-grid" data-testid="prompt-details-component">
            {promptDetailsContent}
        </ColumnLayout>
    );
};

const generatePromptExperienceContent = (selectedDeployment: any) => {
    return (
        <SpaceBetween size="l" data-testid="prompt-experience-details-component">
            <Box variant="h3" padding="n">
                Prompt Experience
            </Box>
            <ValueWithLabel label="Max system prompt template length">
                {selectedDeployment.LlmParams.PromptParams.MaxPromptTemplateLength}
            </ValueWithLabel>
            <ValueWithLabel label="Max chat input length">
                {selectedDeployment.LlmParams.PromptParams.MaxInputTextLength}
            </ValueWithLabel>
            <ValueWithLabel label="Prompt editable on Chat UI">
                {getBooleanString(selectedDeployment.LlmParams.PromptParams.UserPromptEditingEnabled)}
            </ValueWithLabel>
            <ValueWithLabel label="System Prompt template">
                <Box variant="code">
                    {escapedNewLineToLineBreakTag(
                        selectedDeployment.LlmParams.PromptParams.PromptTemplate,
                        useComponentId()
                    )}
                </Box>
            </ValueWithLabel>
            {selectedDeployment.LlmParams.RAGEnabled &&
                selectedDeployment.LlmParams.PromptParams.DisambiguationEnabled && (
                    <ValueWithLabel label="Rephrase Question?">
                        {getBooleanString(selectedDeployment.LlmParams.PromptParams.RephraseQuestion)}
                    </ValueWithLabel>
                )}
        </SpaceBetween>
    );
};

const generatePromptHistoryContent = (selectedDeployment: any) => {
    return (
        <SpaceBetween size="l" data-testid="prompt-history-details-component">
            <Box variant="h3" padding="n">
                History Configuration
            </Box>
            <ValueWithLabel label="Size of trailing history">
                {selectedDeployment.ConversationMemoryParams.ChatHistoryLength}
            </ValueWithLabel>
            <ValueWithLabel label="Human prefix">
                {selectedDeployment.ConversationMemoryParams.HumanPrefix}
            </ValueWithLabel>
            <ValueWithLabel label="AI prefix">{selectedDeployment.ConversationMemoryParams.AiPrefix}</ValueWithLabel>
        </SpaceBetween>
    );
};

const generateDisambiguationPromptContent = (selectedDeployment: any) => {
    return (
        <SpaceBetween size="l" data-testid="prompt-disambiguation-details-component">
            <Box variant="h3" padding="n">
                Disambiguation Prompt
            </Box>
            <ValueWithLabel label="Disambiguation enabled">
                {getBooleanString(selectedDeployment.LlmParams.PromptParams.DisambiguationEnabled)}
            </ValueWithLabel>
            {selectedDeployment.LlmParams.PromptParams.DisambiguationEnabled && (
                <ValueWithLabel label="Disambiguation prompt template">
                    <Box variant="code">
                        {escapedNewLineToLineBreakTag(
                            selectedDeployment.LlmParams.PromptParams.DisambiguationPromptTemplate,
                            useComponentId()
                        )}
                    </Box>
                </ValueWithLabel>
            )}
        </SpaceBetween>
    );
};
