// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { MCPReviewStep } from '../MCPReviewStep';
import { DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';
import { validateBaseWizardProps, testBaseWizardPropsCompliance } from './test-utils';

describe('MCPReviewStep', () => {
    let mcpReviewStep: MCPReviewStep;

    beforeEach(() => {
        mcpReviewStep = new MCPReviewStep();
    });

    test('initializes with correct default properties', () => {
        expect(mcpReviewStep.id).toBe('review');
        expect(mcpReviewStep.title).toBe('Review and create');
        
        // Test BaseWizardProps compliance - this will fail if BaseWizardProps changes
        validateBaseWizardProps(mcpReviewStep.props);
        
        expect(mcpReviewStep.props.inError).toBe(false);
    });

    test('implements BaseWizardProps interface correctly', () => {
        // This test ensures that if BaseWizardProps interface changes, 
        // the test will fail and force developers to update implementations
        testBaseWizardPropsCompliance(mcpReviewStep);
    });

    test('has correct tool content', () => {
        expect(mcpReviewStep.toolContent.title).toBe('Review and create');
        expect(mcpReviewStep.toolContent.content).toBeDefined();
        expect(mcpReviewStep.toolContent.links).toBeDefined();
        expect(mcpReviewStep.toolContent.links.length).toBeGreaterThan(0);
    });

    test('has content generator function', () => {
        expect(typeof mcpReviewStep.contentGenerator).toBe('function');
    });

    test('visibility is initially null', () => {
        expect(mcpReviewStep.visibility).toBeNull();
    });

    describe('mapStepInfoFromDeployment', () => {
        test('handles deployment data without errors', () => {
            const mockDeployment = {
                // MCP review step typically doesn't need specific deployment mapping
            };

            expect(() => {
                mcpReviewStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);
            }).not.toThrow();
        });

        test('handles empty deployment data', () => {
            const originalProps = { ...mcpReviewStep.props };
            
            mcpReviewStep.mapStepInfoFromDeployment(null, DEPLOYMENT_ACTIONS.EDIT);

            // Should maintain default values when deployment is null
            expect(mcpReviewStep.props).toEqual(originalProps);
        });
    });
});