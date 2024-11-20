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

import { AgentStep } from '../Steps/AgentStep';
import { BaseWizardStep } from '../Steps/BaseWizardStep';
import { AgentFlowReviewStep } from '../Steps/AgentFlowReviewStep';
import { UseCaseStep } from '../Steps/UseCaseStep';
import { VpcStep } from '../Steps/VpcStep';
import { UseCaseType } from './UseCaseType';
import { USECASE_TYPES } from '@/utils/constants';

export class AgentUseCaseType extends UseCaseType {
    steps: BaseWizardStep[] = [];

    constructor() {
        super();
        const orderedListOfStepClasses: [new (...args: any[]) => BaseWizardStep, any[]][] = [
            [UseCaseStep, [USECASE_TYPES.AGENT]],
            [VpcStep, []],
            [AgentStep, []],
            [AgentFlowReviewStep, []]
        ];

        this.steps = orderedListOfStepClasses.map(([StepClass, args]) => new StepClass(...args));
    }
}
