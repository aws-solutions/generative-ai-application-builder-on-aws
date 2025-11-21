// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { DEFAULT_STEP_INFO } from '../../steps-config';
import { StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import AgentBuilder from '../../AgentBuilder';
import { mapAgentBuilderStepInfoFromDeployment } from '../../utils';

export interface McpServerReference {
    useCaseId: string;
    useCaseName: string;
    url: string;
    type: 'gateway' | 'runtime';
    status: 'ACTIVE' | 'INACTIVE';
}

export interface AgentBuilderSettings extends BaseWizardProps {
    systemPrompt: string | undefined;
    mcpServers: McpServerReference[];
    tools: any[];
    memoryEnabled: boolean;
}

export class AgentBuilderStep extends BaseWizardStep {
    public id: string = 'agentBuilder';
    public title: string = 'Create Agent';

    public props: AgentBuilderSettings = {
        systemPrompt: DEFAULT_STEP_INFO.agentBuilder.systemPrompt,
        mcpServers: DEFAULT_STEP_INFO.agentBuilder.mcpServers,
        tools: DEFAULT_STEP_INFO.agentBuilder.tools,
        memoryEnabled: DEFAULT_STEP_INFO.agentBuilder.memoryEnabled,
        inError: false
    };

    constructor() {
        super();
    }

    public toolContent: ToolHelpPanelContent = {
        title: 'Create Agent',
        content: (
            <Box variant="p">
                Configure your AI agent with custom prompts, tools, and capabilities using Amazon Bedrock AgentCore.
            </Box>
        ),
        links: [
            {
                href: IG_DOCS.AGENT_USE_CASE,
                text: 'Agent Use Cases'
            },
            {
                href: IG_DOCS.AGENTCORE_RUNTIME_MCP,
                text: 'AgentCore Runtime MCP'
            }
        ]
    };

    public contentGenerator: (props: StepContentProps) => JSX.Element = (props: StepContentProps) => {
        return <AgentBuilder {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {
        ({
            systemPrompt: this.props.systemPrompt,
            mcpServers: this.props.mcpServers,
            tools: this.props.tools,
            memoryEnabled: this.props.memoryEnabled,
            inError: this.props.inError
        } = mapAgentBuilderStepInfoFromDeployment(selectedDeployment));
    };
}
