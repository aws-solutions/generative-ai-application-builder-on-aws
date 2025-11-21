// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_COMPONENT_VISIBILITY, DEFAULT_MODEL_COMPONENT_VISIBILITY, USECASE_TYPES } from '@/utils/constants';
import { BaseWizardStep } from '../Steps/BaseWizardStep';
import { ModelStep } from '../Steps/ModelStep';
import { UseCaseStep } from '../Steps/UseCaseStep';
import { WorkflowStep } from '../Steps/WorkflowStep';
import { WorkflowReviewStep } from '../Steps/WorkflowReviewStep';
import { UseCaseType } from './UseCaseType';

export class WorkflowUseCaseType extends UseCaseType {
    steps: BaseWizardStep[] = [];
    type: string = USECASE_TYPES.WORKFLOW;

    constructor() {
        super();

        const workflowVisibility = {
            ...DEFAULT_COMPONENT_VISIBILITY,
            showManageUserAccess: false,
            showCollectUserFeedback: false,
            showPerformanceOptimization: false
        };

        const excludedModelProviders = ['sagemaker'];

        const workflowModelVisibility = {
            ...DEFAULT_MODEL_COMPONENT_VISIBILITY,
            showMultimodalInputSupport: true
        };

        const orderedListOfStepClasses: [new (...args: any[]) => BaseWizardStep, any[]][] = [
            [UseCaseStep, [USECASE_TYPES.WORKFLOW, workflowVisibility]],
            [ModelStep, [excludedModelProviders, workflowModelVisibility]],
            [WorkflowStep, []],
            [WorkflowReviewStep, []]
        ];

        this.steps = orderedListOfStepClasses.map(([StepClass, args]) => new StepClass(...args));
    }
}
