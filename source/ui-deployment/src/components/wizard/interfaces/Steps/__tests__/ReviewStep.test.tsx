// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { ReviewStep } from '../ReviewStep';
import { DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';

describe('ReviewStep', () => {
    let reviewStep: ReviewStep;

    beforeEach(() => {
        reviewStep = new ReviewStep();
    });

    test('initializes with correct default properties', () => {
        expect(reviewStep.id).toBe('review');
        expect(reviewStep.title).toBe('Review and create');
        expect(reviewStep.props.inError).toBe(false);
    });

    test('has correct tool content', () => {
        expect(reviewStep.toolContent.title).toBe('Review and create');
        expect(reviewStep.toolContent.content).toBeDefined();
        expect(reviewStep.toolContent.links).toBeDefined();
        expect(reviewStep.toolContent.links.length).toBeGreaterThan(0);
    });

    test('has content generator function', () => {
        expect(typeof reviewStep.contentGenerator).toBe('function');
    });

    test('visibility is initially null', () => {
        expect(reviewStep.visibility).toBeNull();
    });

    describe('mapStepInfoFromDeployment', () => {
        test('handles deployment data without errors', () => {
            const mockDeployment = {
                // Review step typically doesn't need specific deployment mapping
            };

            expect(() => {
                reviewStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);
            }).not.toThrow();
        });

        test('handles empty deployment data', () => {
            const originalProps = { ...reviewStep.props };
            
            reviewStep.mapStepInfoFromDeployment(null, DEPLOYMENT_ACTIONS.EDIT);

            // Should maintain default values when deployment is null
            expect(reviewStep.props).toEqual(originalProps);
        });
    });
});