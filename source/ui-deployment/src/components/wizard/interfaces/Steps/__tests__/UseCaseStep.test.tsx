// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { UseCaseStep } from '../UseCaseStep';
import { USECASE_TYPES, DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';

describe('UseCaseStep', () => {
    let useCaseStep: UseCaseStep;

    beforeEach(() => {
        useCaseStep = new UseCaseStep(USECASE_TYPES.TEXT);
    });

    test('initializes with correct default properties', () => {
        expect(useCaseStep.id).toBe('useCase');
        expect(useCaseStep.title).toBe('Select Use Case');
        expect(useCaseStep.props.useCaseType).toBe(USECASE_TYPES.TEXT);
        expect(useCaseStep.props.inError).toBe(false);
    });

    test('can be initialized with specific use case type', () => {
        const agentUseCaseStep = new UseCaseStep(USECASE_TYPES.AGENT);
        expect(agentUseCaseStep.props.useCaseType).toBe(USECASE_TYPES.AGENT);
    });

    test('visibility is initially null until set by UseCaseType', () => {
        // Initially null until set by UseCaseType
        expect(useCaseStep.visibility).toBeNull();
    });

    describe('mapStepInfoFromDeployment', () => {
        test('handles clone action by appending -clone to use case name', () => {
            const mockDeployment = {
                UseCaseName: 'Original Use Case',
                UseCaseDescription: 'Test Description',
                UseCaseType: USECASE_TYPES.TEXT
            };

            useCaseStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.CLONE);

            expect(useCaseStep.props.useCaseName).toBe('Original Use Case-clone');
        });

        test('does not modify use case name for edit action', () => {
            const mockDeployment = {
                UseCaseName: 'OriginalUseCase',
                UseCaseDescription: 'Test Description',
                UseCaseType: USECASE_TYPES.TEXT
            };

            useCaseStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(useCaseStep.props.useCaseName).toBe('OriginalUseCase');
        });
    });
});
