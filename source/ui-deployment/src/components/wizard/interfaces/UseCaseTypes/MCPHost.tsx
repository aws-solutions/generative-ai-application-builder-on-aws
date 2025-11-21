// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BaseWizardStep } from '../Steps/BaseWizardStep';
import { MCPServerStep } from '../Steps/MCPServerStep';
import { MCPReviewStep } from '../Steps/MCPReviewStep';
import { UseCaseType } from './UseCaseType';
import { USECASE_TYPES, DEFAULT_COMPONENT_VISIBILITY } from '@/utils/constants';
import { UseCaseStep } from '../Steps/UseCaseStep';

export class MCPServerUseCaseType extends UseCaseType {
    steps: BaseWizardStep[] = [];
    type: string = USECASE_TYPES.MCP_SERVER;

    constructor() {
        super();

        const mcpVisibility = {
            ...DEFAULT_COMPONENT_VISIBILITY,
            showDeployUI: false,
            showManageUserAccess: false,
            showCollectUserFeedback: false,
            showPerformanceOptimization: false
        };

        const orderedListOfStepClasses: [new (...args: any[]) => BaseWizardStep, any[]][] = [
            [UseCaseStep, [this.type, mcpVisibility]],
            [MCPServerStep, []],
            [MCPReviewStep, []]
        ];

        this.steps = orderedListOfStepClasses.map(([StepClass, args]) => new StepClass(...args));
    }
}
