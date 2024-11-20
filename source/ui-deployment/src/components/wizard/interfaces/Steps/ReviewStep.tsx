/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { ReviewProps, StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import Review from '../../Review';

export interface ReviewSettings extends BaseWizardProps {}

export class ReviewStep extends BaseWizardStep {
    public id: string = 'review';
    public title: string = 'Review and create';

    public props: ReviewSettings = {
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
        return <Review {...(props as ReviewProps)} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {};
}
