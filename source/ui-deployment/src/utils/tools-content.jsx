// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, HelpPanel, SpaceBetween } from '@cloudscape-design/components';
import { ExternalLinkGroup } from '../components/commons';
import { IG_DOCS, USECASE_TYPES } from './constants';

const INFO_PANEL_CONTENT = {
    [USECASE_TYPES.TEXT]: [
        {
            title: 'Model',
            description: 'This section shows information about the model that is being used by this deployment.'
        },
        {
            title: 'Knowledge Base',
            description:
                'This section shows information about the knowledge base that is being used by this deployment (if applicable).'
        },
        {
            title: 'Prompt',
            description: 'This section shows information about the prompt related settings used by this deployment.'
        }
    ],
    [USECASE_TYPES.AGENT]: [
        {
            title: 'Agent',
            description: 'This section shows information about the agent that is being used by this deployment.'
        }
    ],
    [USECASE_TYPES.MCP_SERVER]: [
        {
            title: 'MCP Server',
            description: 'This section shows information about the MCP server configuration used by this deployment.'
        }
    ],
    [USECASE_TYPES.AGENT_BUILDER]: [
        {
            title: 'Agent Details',
            description: 'This section shows information about the agent configuration used by this deployment.'
        },
        {
            title: 'Tools and Resources',
            description: 'This section shows information about the MCP servers and tools available to the agent.'
        },
        {
            title: 'Model',
            description: 'This section shows information about the model that is being used by this deployment.'
        }
    ],
    [USECASE_TYPES.WORKFLOW]: [
        {
            title: 'Workflow Configuration',
            description: 'This section shows information about the workflow configuration used by this deployment.'
        },
        {
            title: 'Multi-Agent Orchestration',
            description:
                'This section shows information about the orchestration pattern and agents used in the workflow.'
        },
        {
            title: 'Model',
            description: 'This section shows information about the model that is being used by this deployment.'
        }
    ]
};

export const ToolsContent = ({ useCaseType }) => {
    // Get content for the use case type, fallback to TEXT if not found
    const content = INFO_PANEL_CONTENT[useCaseType] || INFO_PANEL_CONTENT[USECASE_TYPES.TEXT];

    return (
        <HelpPanel
            header={<h2>Deployment Details</h2>}
            footer={
                <ExternalLinkGroup
                    items={[
                        {
                            href: IG_DOCS.USING_THE_SOLUTION,
                            text: 'Using the solution'
                        }
                    ]}
                />
            }
        >
            <SpaceBetween size="s">
                <Box variant="p">
                    This page displays the details of your deployment. You can also use this page to navigate to the
                    deployed application, as well as relevant resources on the AWS Console.
                </Box>

                <>
                    {content.map((section) => (
                        <React.Fragment key={section.title}>
                            <Box variant="h4">{section.title}</Box>
                            <Box variant="p">{section.description}</Box>
                        </React.Fragment>
                    ))}
                </>
            </SpaceBetween>
        </HelpPanel>
    );
};
