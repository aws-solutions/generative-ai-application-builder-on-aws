// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ReviewProps, StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardStep, BaseWizardProps } from './BaseWizardStep';
import { Box } from '@cloudscape-design/components';
import { IG_DOCS, OrchestrationPattern } from '@/utils/constants';
import Workflow from '../../Workflow';
import { AgentBuilderSettings } from './AgentBuilderStep';
import { DEFAULT_STEP_INFO } from '../../steps-config';
import { mapWorkflowStepInfoFromDeployment } from '../../utils';

export interface Agent {
    useCaseId: string;
    useCaseType: string;
    useCaseName: string;
    useCaseDescription?: string;
    agentBuilderParams?: AgentBuilderSettings;
    llmParams?: any;
}

export interface WorkflowSettings extends BaseWizardProps {
    orchestrationPattern: string;
    systemPrompt: string;
    selectedAgents: any[];
    memoryEnabled: boolean;
}

export class WorkflowStep extends BaseWizardStep {
    public id: string = 'workflow';
    public title: string = 'Workflow Configuration';
    public props: WorkflowSettings = {
        orchestrationPattern: DEFAULT_STEP_INFO.workflow.orchestrationPattern,
        systemPrompt: DEFAULT_STEP_INFO.workflow.systemPrompt,
        selectedAgents: DEFAULT_STEP_INFO.workflow.selectedAgents,
        memoryEnabled: DEFAULT_STEP_INFO.workflow.memoryEnabled,
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Workflow Configuration',
        content: (
            <Box variant="p">
                Configure your multi-agent workflow by selecting specialized agents and setting up the client agent that
                will orchestrate them.
            </Box>
        ),
        links: [
            {
                href: IG_DOCS.AGENT_USE_CASE,
                text: 'Agent Use Case Documentation'
            }
        ]
    };

    constructor() {
        super();
    }

    public contentGenerator = (props: StepContentProps | ReviewProps): JSX.Element => {
        return <Workflow {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {
        ({
            orchestrationPattern: this.props.orchestrationPattern,
            systemPrompt: this.props.systemPrompt,
            selectedAgents: this.props.selectedAgents,
            memoryEnabled: this.props.memoryEnabled,
            inError: this.props.inError
        } = mapWorkflowStepInfoFromDeployment(selectedDeployment));
    };
}
