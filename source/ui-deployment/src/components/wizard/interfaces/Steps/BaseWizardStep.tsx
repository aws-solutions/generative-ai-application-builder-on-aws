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

import { ReviewProps, StepContentProps, ToolHelpPanelContent } from '../Steps';

export abstract class BaseWizardStep {
    public isOptional: boolean = false;
    public abstract id: string;
    public abstract title: string;
    public abstract props: BaseWizardProps;
    public abstract toolContent: ToolHelpPanelContent;
    public abstract contentGenerator: (props: StepContentProps | ReviewProps) => JSX.Element;
    public abstract mapStepInfoFromDeployment: (selectedDeployment: any, deploymentAction: string) => void;
}

export abstract class BaseWizardProps {
    public inError: boolean = false;
}
