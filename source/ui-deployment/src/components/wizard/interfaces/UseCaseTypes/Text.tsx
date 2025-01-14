// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { USECASE_TYPES } from '@/utils/constants';
import { BaseWizardStep } from '../Steps/BaseWizardStep';
import { KnowledgeBaseStep } from '../Steps/KnowledgeBaseStep';
import { ModelStep } from '../Steps/ModelStep';
import { PromptStep } from '../Steps/PromptStep';
import { ReviewStep } from '../Steps/ReviewStep';
import { UseCaseStep } from '../Steps/UseCaseStep';
import { VpcStep } from '../Steps/VpcStep';
import { UseCaseType } from './UseCaseType';

export class TextUseCaseType extends UseCaseType {
    steps: BaseWizardStep[] = [];

    constructor() {
        super();
        const orderedListOfStepClasses: [new (...args: any[]) => BaseWizardStep, any[]][] = [
            [UseCaseStep, [USECASE_TYPES.TEXT]],
            [VpcStep, []],
            [ModelStep, []],
            [KnowledgeBaseStep, []],
            [PromptStep, []],
            [ReviewStep, []]
        ];

        this.steps = orderedListOfStepClasses.map(([StepClass, args]) => new StepClass(...args));
    }
}
