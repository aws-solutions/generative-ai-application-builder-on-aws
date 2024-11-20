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
