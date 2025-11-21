// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect } from 'vitest';
import { TextUseCaseType } from '../Text';
import { AgentUseCaseType } from '../Agent';
import { AgentBuilderUseCaseType } from '../AgentBuilder';
import { MCPServerUseCaseType } from '../MCPHost';
import { WorkflowUseCaseType } from '../Workflow';
import { DEFAULT_COMPONENT_VISIBILITY } from '../../../../../utils/constants';

describe('UseCaseType implementations', () => {
    describe('TextUseCaseType', () => {
        test('should create steps with correct visibility', () => {
            const textUseCase = new TextUseCaseType();

            expect(textUseCase.steps).toHaveLength(6);

            // Only UseCase step should have visibility, others should be null
            expect(textUseCase.steps[0].id).toBe('useCase');
            expect(textUseCase.steps[0].visibility).toEqual(DEFAULT_COMPONENT_VISIBILITY);

            // All other steps should have null visibility
            for (let i = 1; i < textUseCase.steps.length; i++) {
                expect(textUseCase.steps[i].visibility).toBeNull();
            }
        });

        test('should have correct step order', () => {
            const textUseCase = new TextUseCaseType();

            expect(textUseCase.steps[0].id).toBe('useCase');
            expect(textUseCase.steps[1].id).toBe('vpc');
            expect(textUseCase.steps[2].id).toBe('model');
            expect(textUseCase.steps[3].id).toBe('knowledgeBase');
            expect(textUseCase.steps[4].id).toBe('prompt');
            expect(textUseCase.steps[5].id).toBe('review');
        });
    });

    describe('AgentUseCaseType', () => {
        test('should create steps with correct visibility', () => {
            const agentUseCase = new AgentUseCaseType();

            expect(agentUseCase.steps).toHaveLength(4);

            // Only UseCase step should have visibility
            expect(agentUseCase.steps[0].id).toBe('useCase');
            expect(agentUseCase.steps[0].visibility).toEqual(DEFAULT_COMPONENT_VISIBILITY);

            // All other steps should have null visibility
            for (let i = 1; i < agentUseCase.steps.length; i++) {
                expect(agentUseCase.steps[i].visibility).toBeNull();
            }
        });

        test('should have correct step order', () => {
            const agentUseCase = new AgentUseCaseType();

            expect(agentUseCase.steps[0].id).toBe('useCase');
            expect(agentUseCase.steps[1].id).toBe('vpc');
            expect(agentUseCase.steps[2].id).toBe('agent');
            expect(agentUseCase.steps[3].id).toBe('review');
        });
    });

    describe('AgentBuilderUseCaseType', () => {
        test('should create steps with custom visibility', () => {
            const agentBuilderUseCase = new AgentBuilderUseCaseType();

            expect(agentBuilderUseCase.steps).toHaveLength(4);

            const expectedVisibility = {
                ...DEFAULT_COMPONENT_VISIBILITY,
                showManageUserAccess: false,
                showCollectUserFeedback: false,
                showPerformanceOptimization: false
            };

            // Only UseCase step should have custom visibility
            expect(agentBuilderUseCase.steps[0].id).toBe('useCase');
            expect(agentBuilderUseCase.steps[0].visibility).toEqual(expectedVisibility);

            // All other steps should have null visibility
            for (let i = 1; i < agentBuilderUseCase.steps.length; i++) {
                expect(agentBuilderUseCase.steps[i].visibility).toBeNull();
            }
        });

        test('should have correct step order', () => {
            const agentBuilderUseCase = new AgentBuilderUseCaseType();

            expect(agentBuilderUseCase.steps[0].id).toBe('useCase');
            expect(agentBuilderUseCase.steps[1].id).toBe('model');
            expect(agentBuilderUseCase.steps[2].id).toBe('agentBuilder');
            expect(agentBuilderUseCase.steps[3].id).toBe('review');
        });
    });

    describe('MCPServerUseCaseType', () => {
        test('should create steps with custom visibility', () => {
            const mcpUseCase = new MCPServerUseCaseType();

            expect(mcpUseCase.steps).toHaveLength(3);

            const expectedVisibility = {
                ...DEFAULT_COMPONENT_VISIBILITY,
                showDeployUI: false,
                showManageUserAccess: false,
                showCollectUserFeedback: false,
                showPerformanceOptimization: false
            };

            // Only UseCase step should have custom visibility
            expect(mcpUseCase.steps[0].id).toBe('useCase');
            expect(mcpUseCase.steps[0].visibility).toEqual(expectedVisibility);

            for (let i = 1; i < mcpUseCase.steps.length; i++) {
                expect(mcpUseCase.steps[i].visibility).toBeNull();
            }
        });

        test('should have correct step order', () => {
            const mcpUseCase = new MCPServerUseCaseType();

            expect(mcpUseCase.steps[0].id).toBe('useCase');
            expect(mcpUseCase.steps[1].id).toBe('mcpServer');
            expect(mcpUseCase.steps[2].id).toBe('review');
        });
    });

    describe('WorkflowUseCaseType', () => {
        test('should create steps with custom visibility', () => {
            const workflowUseCase = new WorkflowUseCaseType();

            expect(workflowUseCase.steps).toHaveLength(4);

            const expectedVisibility = {
                ...DEFAULT_COMPONENT_VISIBILITY,
                showManageUserAccess: false,
                showCollectUserFeedback: false,
                showPerformanceOptimization: false
            };

            // Only UseCase step should have custom visibility
            expect(workflowUseCase.steps[0].id).toBe('useCase');
            expect(workflowUseCase.steps[0].visibility).toEqual(expectedVisibility);

            // All other steps should have null visibility
            for (let i = 1; i < workflowUseCase.steps.length; i++) {
                expect(workflowUseCase.steps[i].visibility).toBeNull();
            }
        });

        test('should have correct step order', () => {
            const workflowUseCase = new WorkflowUseCaseType();

            expect(workflowUseCase.steps[0].id).toBe('useCase');
            expect(workflowUseCase.steps[1].id).toBe('model');
            expect(workflowUseCase.steps[2].id).toBe('workflow');
            expect(workflowUseCase.steps[3].id).toBe('review');
        });

        test('should have correct use case type', () => {
            const workflowUseCase = new WorkflowUseCaseType();

            expect(workflowUseCase.type).toBe('Workflow');
        });
    });

    describe('Constructor-based visibility', () => {
        test('should set visibility at construction time', () => {
            const textUseCase = new TextUseCaseType();
            const useCaseStep = textUseCase.steps[0];

            // Visibility should be set during construction
            expect(useCaseStep.visibility).toEqual(DEFAULT_COMPONENT_VISIBILITY);
            expect(useCaseStep.id).toBe('useCase');
        });

        test('should create steps with null visibility by default', () => {
            const textUseCase = new TextUseCaseType();
            const vpcStep = textUseCase.steps[1];
            expect(vpcStep.visibility).toBeNull();
            expect(vpcStep.id).toBe('vpc');
        });
    });
});
