// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { ReviewProps, StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import AgentBuilderFlowReview from '../../Review/AgentBuilderFlowReview';

export interface AgentBuilderReviewSettings extends BaseWizardProps {}

export class AgentBuilderReviewStep extends BaseWizardStep {
    public id: string = 'review';
    public title: string = 'Review and create';

    public props: AgentBuilderReviewSettings = {
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Review and create',
        content: <Box variant="p">Use this page to perform a final review before creating your agent deployment.</Box>,
        links: [
            {
                href: IG_DOCS.USING_THE_SOLUTION,
                text: 'Next Steps: Using the solution'
            },
            {
                href: IG_DOCS.AGENT_USE_CASE,
                text: 'Agent Use Cases'
            }
        ]
    };

    public contentGenerator: (props: StepContentProps) => JSX.Element = (props: StepContentProps) => {
        return <AgentBuilderFlowReview {...(props as ReviewProps)} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {};
}
