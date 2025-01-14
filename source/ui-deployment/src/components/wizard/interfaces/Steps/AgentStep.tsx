// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { DEFAULT_STEP_INFO } from '../../steps-config';
import { StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import Agent from '../../Agent';
import { mapAgentStepInfoFromDeployment } from '../../utils';

export interface AgentSettings extends BaseWizardProps {
    bedrockAgentId: string | undefined;
    bedrockAgentAliasId: string | undefined;
    enableTrace: boolean | undefined;
}

export class AgentStep extends BaseWizardStep {
    public id: string = 'agent';
    public title: string = 'Select Agent';

    public props: AgentSettings = {
        bedrockAgentId: DEFAULT_STEP_INFO.agent.bedrockAgentId,
        bedrockAgentAliasId: DEFAULT_STEP_INFO.agent.bedrockAgentAliasId,
        enableTrace: DEFAULT_STEP_INFO.agent.enableTrace,
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Agent selection',
        content: <Box variant="p">Use this page to configure the agent used by the deployment.</Box>,
        links: [
            {
                href: 'https://aws.amazon.com/bedrock/agents/',
                text: 'Bedrock Agents'
            },
            {
                href: IG_DOCS.AGENT_USE_CASE,
                text: 'Agent Use Case'
            }
        ]
    };

    public contentGenerator: (props: StepContentProps) => JSX.Element = (props: StepContentProps) => {
        return <Agent {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {
        ({
            bedrockAgentId: this.props.bedrockAgentId,
            bedrockAgentAliasId: this.props.bedrockAgentAliasId,
            enableTrace: this.props.enableTrace,
            inError: this.props.inError
        } = mapAgentStepInfoFromDeployment(selectedDeployment));
    };
}
