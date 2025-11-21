// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import MCPReview from '../../Review/MCPReview';

export interface MCPReviewSettings extends BaseWizardProps {}

export class MCPReviewStep extends BaseWizardStep {
    public id: string = 'review';
    public title: string = 'Review and create';

    public props: MCPReviewSettings = {
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Review and create',
        content: <Box variant="p">Review your MCP server configuration before creating the deployment.</Box>,
        links: [
            {
                href: IG_DOCS.USING_THE_SOLUTION,
                text: 'Next Steps: Using the solution'
            }
        ]
    };

    public contentGenerator: (props: StepContentProps) => JSX.Element = (props: StepContentProps) => {
        return <MCPReview {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {};
}