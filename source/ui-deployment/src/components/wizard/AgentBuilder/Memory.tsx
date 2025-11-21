// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Container, FormField, Header, RadioGroup, SpaceBetween } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../interfaces';
import { InfoLink } from '@/components/commons';
import { IG_DOCS } from '@/utils/constants';

export interface MemoryProps extends BaseFormComponentProps {
    memoryEnabled: boolean;
    'data-testid'?: string;
}

export const Memory = (props: MemoryProps) => {
    const handleMemoryChange = (detail: { value: string }) => {
        props.onChangeFn({ memoryEnabled: detail.value === 'yes' });
    };

    return (
        <Container
            header={<Header data-testid="memory-header">Memory management</Header>}
            data-testid={props['data-testid']}
        >
            <SpaceBetween size="l">
                <FormField
                    label="Long-term Memory"
                    info={
                        <InfoLink
                            onFollow={() => props.setHelpPanelContent!(memoryInfoPanel)}
                            data-testid="memory-info-link"
                        />
                    }
                    description="Enable your agent to retain information across multiple conversations"
                    data-testid="memory-form-field"
                >
                    <RadioGroup
                        onChange={({ detail }) => handleMemoryChange(detail)}
                        value={props.memoryEnabled ? 'yes' : 'no'}
                        items={[
                            {
                                value: 'yes',
                                label: 'Yes',
                                description: 'Store conversation data for extended periods to improve context retention'
                            },
                            {
                                value: 'no',
                                label: 'No',
                                description: "Don't retain conversation history between sessions"
                            }
                        ]}
                        data-testid="memory-radio-group"
                    />
                </FormField>
            </SpaceBetween>
        </Container>
    );
};

export default Memory;

const memoryInfoPanel = {
    title: 'Memory Management',
    content: (
        <div>
            <Box>
                Memory management controls how your AI agent handles conversation history and context retention across
                multiple interactions.
            </Box>
            <Box variant="h4">Long-term Memory:</Box>
            <ul>
                <li>
                    <b>Enabled:</b> Agent retains context from previous conversations, improving personalization and
                    continuity
                </li>
                <li>
                    <b>Disabled:</b> Each conversation starts fresh with no memory of previous interactions
                </li>
            </ul>
            <Box variant="h4">Benefits of Long-term Memory:</Box>
            <ul>
                <li>Improved context awareness across sessions</li>
                <li>Better personalization based on user preferences</li>
                <li>Continuity in ongoing projects or discussions</li>
                <li>Enhanced user experience through remembered context</li>
            </ul>
            <Box variant="h4">Considerations:</Box>
            <ul>
                <li>Memory storage may impact response time</li>
                <li>Consider privacy implications of storing conversation data</li>
                <li>Memory capacity may have limits depending on your configuration</li>
            </ul>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.AGENT_USE_CASE,
            text: 'Agent use case documentation'
        }
    ]
};
