// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect } from 'vitest';
import { TextUseCaseType } from '../interfaces/UseCaseTypes/Text';
import { AgentUseCaseType } from '../interfaces/UseCaseTypes/Agent';
import { AgentBuilderUseCaseType } from '../interfaces/UseCaseTypes/AgentBuilder';
import { MCPServerUseCaseType } from '../interfaces/UseCaseTypes/MCPHost';
import { DEFAULT_COMPONENT_VISIBILITY } from '../../../utils/constants';

describe('WizardView Visibility Integration', () => {
    test('Text use case type creates steps with correct visibility', () => {
        const textUseCase = new TextUseCaseType();

        // Only UseCaseStep (first step) should have default visibility
        expect(textUseCase.steps[0].visibility).toEqual(DEFAULT_COMPONENT_VISIBILITY);
        textUseCase.steps.slice(1).forEach((step) => {
            expect(step.visibility).toBeNull();
        });
    });

    test('Agent use case type creates steps with correct visibility', () => {
        const agentUseCase = new AgentUseCaseType();

        // Only UseCaseStep (first step) should have default visibility
        expect(agentUseCase.steps[0].visibility).toEqual(DEFAULT_COMPONENT_VISIBILITY);
        agentUseCase.steps.slice(1).forEach((step) => {
            expect(step.visibility).toBeNull();
        });
    });

    test('MCP Server use case type creates steps with correct visibility', () => {
        const mcpUseCase = new MCPServerUseCaseType();

        const expectedVisibility = {
            ...DEFAULT_COMPONENT_VISIBILITY,
            showDeployUI: false,
            showManageUserAccess: false,
            showCollectUserFeedback: false,
            showPerformanceOptimization: false
        };

        // Only UseCaseStep (first step) should have custom visibility
        expect(mcpUseCase.steps[0].visibility).toEqual(expectedVisibility);
        mcpUseCase.steps.slice(1).forEach((step) => {
            expect(step.visibility).toBeNull();
        });
    });

    test('Agent Builder use case type creates steps with correct visibility', () => {
        const agentBuilderUseCase = new AgentBuilderUseCaseType();

        const expectedVisibility = {
            ...DEFAULT_COMPONENT_VISIBILITY,
            showManageUserAccess: false,
            showCollectUserFeedback: false,
            showPerformanceOptimization: false
        };

        // Only UseCaseStep (first step) should have custom visibility
        expect(agentBuilderUseCase.steps[0].visibility).toEqual(expectedVisibility);
        agentBuilderUseCase.steps.slice(1).forEach((step) => {
            expect(step.visibility).toBeNull();
        });
    });
});
