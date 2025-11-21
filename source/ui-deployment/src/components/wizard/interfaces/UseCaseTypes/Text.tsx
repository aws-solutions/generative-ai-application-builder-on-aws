// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { USECASE_TYPES, DEFAULT_COMPONENT_VISIBILITY, DEFAULT_MODEL_COMPONENT_VISIBILITY } from '@/utils/constants';
import { BaseWizardStep } from '../Steps/BaseWizardStep';
import { KnowledgeBaseStep } from '../Steps/KnowledgeBaseStep';
import { ModelStep } from '../Steps/ModelStep';
import { PromptStep } from '../Steps/PromptStep';
import { ReviewStep } from '../Steps/ReviewStep';
import { UseCaseStep } from '../Steps/UseCaseStep';
import { VpcStep } from '../Steps/VpcStep';
import { UseCaseType } from './UseCaseType';
import { ComponentVisibility } from '../Steps';

export class TextUseCaseType extends UseCaseType {
    steps: BaseWizardStep[] = [];
    type: string = USECASE_TYPES.TEXT;

    public getVisibility(): ComponentVisibility {
        return DEFAULT_COMPONENT_VISIBILITY;
    }

    constructor() {
        super();

        const orderedListOfStepClasses: [new (...args: any[]) => BaseWizardStep, any[]][] = [
            [UseCaseStep, [this.type, DEFAULT_COMPONENT_VISIBILITY]],
            [VpcStep, []],
            [ModelStep, [[], DEFAULT_MODEL_COMPONENT_VISIBILITY]],
            [KnowledgeBaseStep, []],
            [PromptStep, []],
            [ReviewStep, []]
        ];

        this.steps = orderedListOfStepClasses.map(([StepClass, args]) => new StepClass(...args));
    }
}
