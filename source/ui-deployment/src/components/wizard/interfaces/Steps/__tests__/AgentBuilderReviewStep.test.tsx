// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AgentBuilderReviewStep } from '../AgentBuilderReviewStep';
import { IG_DOCS } from '@/utils/constants';

describe('AgentBuilderReviewStep', () => {
    let agentBuilderReviewStep: AgentBuilderReviewStep;

    beforeEach(() => {
        agentBuilderReviewStep = new AgentBuilderReviewStep();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should have correct id and title', () => {
        expect(agentBuilderReviewStep.id).toBe('review');
        expect(agentBuilderReviewStep.title).toBe('Review and create');
    });

    test('should initialize with default props', () => {
        expect(agentBuilderReviewStep.props).toEqual({
            inError: false
        });
    });

    test('should have correct tool content', () => {
        expect(agentBuilderReviewStep.toolContent.title).toBe('Review and create');
        expect(agentBuilderReviewStep.toolContent.links).toHaveLength(2);
        expect(agentBuilderReviewStep.toolContent.links[0]).toEqual({
            href: IG_DOCS.USING_THE_SOLUTION,
            text: 'Next Steps: Using the solution'
        });
        expect(agentBuilderReviewStep.toolContent.links[1]).toEqual({
            href: IG_DOCS.AGENT_USE_CASE,
            text: 'Agent Use Cases'
        });
    });

    test('should generate content component', () => {
        const mockProps = {
            info: {
                useCase: {
                    useCaseName: 'Test Agent',
                    useCaseDescription: 'Test Description',
                    deployUI: true
                },
                agentBuilder: {
                    systemPrompt: 'Test prompt',
                    modelName: 'test-model',
                    temperature: 0.5
                }
            },
            setActiveStepIndex: vi.fn()
        };

        const content = agentBuilderReviewStep.contentGenerator(mockProps);
        expect(content).toBeDefined();
        expect(content.type.name).toBe('AgentBuilderFlowReview');
    });

    test('should handle mapStepInfoFromDeployment with any deployment data', () => {
        const mockDeployment = {
            UseCaseConfig: {
                UseCaseName: 'Test Agent',
                UseCaseDescription: 'Test Description'
            },
            AgentParams: {
                SystemPrompt: 'Test prompt',
                ModelName: 'test-model'
            }
        };

        // Should not throw error and should be a no-op
        expect(() => {
            agentBuilderReviewStep.mapStepInfoFromDeployment(mockDeployment, 'EDIT');
        }).not.toThrow();

        // Props should remain unchanged since it's a no-op
        expect(agentBuilderReviewStep.props).toEqual({
            inError: false
        });
    });

    test('should handle mapStepInfoFromDeployment with null deployment', () => {
        expect(() => {
            agentBuilderReviewStep.mapStepInfoFromDeployment(null, 'CREATE');
        }).not.toThrow();

        expect(agentBuilderReviewStep.props).toEqual({
            inError: false
        });
    });

    test('should handle mapStepInfoFromDeployment with undefined deployment', () => {
        expect(() => {
            agentBuilderReviewStep.mapStepInfoFromDeployment(undefined, 'CREATE');
        }).not.toThrow();

        expect(agentBuilderReviewStep.props).toEqual({
            inError: false
        });
    });

    test('should handle mapStepInfoFromDeployment with empty deployment', () => {
        expect(() => {
            agentBuilderReviewStep.mapStepInfoFromDeployment({}, 'EDIT');
        }).not.toThrow();

        expect(agentBuilderReviewStep.props).toEqual({
            inError: false
        });
    });
});
