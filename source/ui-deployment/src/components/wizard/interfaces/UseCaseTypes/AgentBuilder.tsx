// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { USECASE_TYPES, DEFAULT_COMPONENT_VISIBILITY, DEFAULT_MODEL_COMPONENT_VISIBILITY } from '@/utils/constants';
import { BaseWizardStep } from '../Steps/BaseWizardStep';
import { AgentBuilderStep } from '../Steps/AgentBuilderStep';
import { AgentBuilderReviewStep } from '../Steps/AgentBuilderReviewStep';
import { UseCaseStep } from '../Steps/UseCaseStep';
import { UseCaseType } from './UseCaseType';
import { ModelStep } from '../Steps/ModelStep';

export class AgentBuilderUseCaseType extends UseCaseType {
    steps: BaseWizardStep[] = [];
    type: string = USECASE_TYPES.AGENT_BUILDER;

    constructor() {
        super();

        const agentBuilderVisibility = {
            ...DEFAULT_COMPONENT_VISIBILITY,
            showManageUserAccess: false,
            showCollectUserFeedback: false,
            showPerformanceOptimization: false
        };

        const excludedModelProviders = ['sagemaker'];

        const agentBuilderModelVisibility = {
            ...DEFAULT_MODEL_COMPONENT_VISIBILITY,
            showMultimodalInputSupport: true
        };

        const orderedListOfStepClasses: [new (...args: any[]) => BaseWizardStep, any[]][] = [
            [UseCaseStep, [this.type, agentBuilderVisibility]],
            [ModelStep, [excludedModelProviders, agentBuilderModelVisibility]],
            [AgentBuilderStep, []],
            [AgentBuilderReviewStep, []]
        ];

        this.steps = orderedListOfStepClasses.map(([StepClass, args]) => new StepClass(...args));
    }
}
