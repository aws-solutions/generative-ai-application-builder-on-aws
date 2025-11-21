// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AgentStep } from '../Steps/AgentStep';
import { BaseWizardStep } from '../Steps/BaseWizardStep';
import { AgentFlowReviewStep } from '../Steps/AgentFlowReviewStep';
import { UseCaseStep } from '../Steps/UseCaseStep';
import { VpcStep } from '../Steps/VpcStep';
import { UseCaseType } from './UseCaseType';
import { USECASE_TYPES, DEFAULT_COMPONENT_VISIBILITY } from '@/utils/constants';

export class AgentUseCaseType extends UseCaseType {
    steps: BaseWizardStep[] = [];
    type: string = USECASE_TYPES.AGENT;

    constructor() {
        super();

        const orderedListOfStepClasses: [new (...args: any[]) => BaseWizardStep, any[]][] = [
            [UseCaseStep, [this.type, DEFAULT_COMPONENT_VISIBILITY]],
            [VpcStep, []],
            [AgentStep, []],
            [AgentFlowReviewStep, []]
        ];

        this.steps = orderedListOfStepClasses.map(([StepClass, args]) => new StepClass(...args));
    }
}
