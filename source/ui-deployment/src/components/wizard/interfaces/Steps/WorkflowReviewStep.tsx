// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { ReviewProps, StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardStep, BaseWizardProps } from './BaseWizardStep';
import WorkflowReview from '../../Workflow/WorkflowReview';

export interface WorkflowReviewSettings extends BaseWizardProps {}

export class WorkflowReviewStep extends BaseWizardStep {
    public id: string = 'review';
    public title: string = 'Review and create';

    public props: WorkflowReviewSettings = {
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Review and create',
        content: <Box variant="p">Use this page to perform a final review before creating your deployment.</Box>,
        links: [
            {
                href: IG_DOCS.USING_THE_SOLUTION,
                text: 'Next Steps: Using the solution'
            }
        ]
    };

    public contentGenerator: (props: StepContentProps) => JSX.Element = (props: StepContentProps) => {
        return <WorkflowReview {...(props as ReviewProps)} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {};
}
