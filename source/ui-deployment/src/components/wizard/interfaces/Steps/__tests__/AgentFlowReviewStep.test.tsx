// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { AgentFlowReviewStep } from '../AgentFlowReviewStep';
import { DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';

describe('AgentFlowReviewStep', () => {
    let agentFlowReviewStep: AgentFlowReviewStep;

    beforeEach(() => {
        agentFlowReviewStep = new AgentFlowReviewStep();
    });

    test('initializes with correct default properties', () => {
        expect(agentFlowReviewStep.id).toBe('review');
        expect(agentFlowReviewStep.title).toBe('Review and create');
        expect(agentFlowReviewStep.props.inError).toBe(false);
    });

    test('has correct tool content', () => {
        expect(agentFlowReviewStep.toolContent.title).toBe('Review and create');
        expect(agentFlowReviewStep.toolContent.content).toBeDefined();
        expect(agentFlowReviewStep.toolContent.links).toBeDefined();
        expect(agentFlowReviewStep.toolContent.links.length).toBeGreaterThan(0);
    });

    test('has content generator function', () => {
        expect(typeof agentFlowReviewStep.contentGenerator).toBe('function');
    });

    test('visibility is initially null', () => {
        expect(agentFlowReviewStep.visibility).toBeNull();
    });

    describe('mapStepInfoFromDeployment', () => {
        test('handles deployment data without errors', () => {
            const mockDeployment = {
                // Agent flow review step typically doesn't need specific deployment mapping
            };

            expect(() => {
                agentFlowReviewStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);
            }).not.toThrow();
        });

        test('handles empty deployment data', () => {
            const originalProps = { ...agentFlowReviewStep.props };
            
            agentFlowReviewStep.mapStepInfoFromDeployment(null, DEPLOYMENT_ACTIONS.EDIT);

            // Should maintain default values when deployment is null
            expect(agentFlowReviewStep.props).toEqual(originalProps);
        });
    });
});