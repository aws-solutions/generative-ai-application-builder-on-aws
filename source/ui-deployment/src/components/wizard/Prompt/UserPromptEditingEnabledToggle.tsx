// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, FormField, Toggle, ToggleProps } from '@cloudscape-design/components';
import { BaseToggleComponentProps } from '../interfaces';
import { IG_DOCS } from '@/utils/constants';
import { InfoLink } from '@/components/commons';

export interface UserPromptEditingEnabledToggleProps extends BaseToggleComponentProps {
    userPromptEditingEnabled: boolean;
}

export const UserPromptEditingEnabledToggle = (props: UserPromptEditingEnabledToggleProps) => {
    const onUserPromptEditingEnabledChange = (detail: ToggleProps.ChangeDetail) => {
        props.onChangeFn({ 'userPromptEditingEnabled': detail.checked });
    };

    return (
        <FormField
            label="User Prompt Editing"
            description="If disabled, the prompt template will not be modifiable after deployment."
            data-testid="user-prompt-editing-enabled-toggle-field"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(userPromptEditingEnabledInfoPanel)}
                    ariaLabel={'User prompt editing toggle'}
                />
            }
        >
            <Toggle
                onChange={({ detail }) => onUserPromptEditingEnabledChange(detail)}
                checked={props.userPromptEditingEnabled}
                data-testid="user-prompt-editing-enabled-toggle"
            />
        </FormField>
    );
};

const userPromptEditingEnabledInfoPanel = {
    title: 'User Prompt Editing',
    content: (
        <div>
            <Box variant="p">This setting is used to control whether users can modify prompts or not.</Box>
            <Box variant="p">
                <i></i>
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

export default UserPromptEditingEnabledToggle;
