// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ReviewProps, StepContentProps, ToolHelpPanelContent, ComponentVisibility } from '../Steps';

export abstract class BaseWizardStep {
    public isOptional: boolean = false;
    public abstract id: string;
    public abstract title: string;
    public abstract props: BaseWizardProps;
    public abstract toolContent: ToolHelpPanelContent;
    public abstract contentGenerator: (props: StepContentProps | ReviewProps) => JSX.Element;
    public abstract mapStepInfoFromDeployment: (selectedDeployment: any, deploymentAction: string) => void;
    // visibility defines the component-level visibility configuration for this step
    // Default implementation returns null (no visibility restrictions)
    public visibility: ComponentVisibility | null = null;

    constructor(visibility: ComponentVisibility | null = null) {
        this.visibility = visibility;
    }
}

export abstract class BaseWizardProps {
    public inError: boolean = false;
}
