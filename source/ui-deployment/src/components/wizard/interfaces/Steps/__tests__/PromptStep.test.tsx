// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { PromptStep } from '../PromptStep';
import { DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';
import { validateBaseWizardProps, testBaseWizardPropsCompliance } from './test-utils';

describe('PromptStep', () => {
    let promptStep: PromptStep;

    beforeEach(() => {
        promptStep = new PromptStep();
    });

    test('initializes with correct default properties', () => {
        expect(promptStep.id).toBe('prompt');
        expect(promptStep.title).toBe('Select prompt');
        
        // Test BaseWizardProps compliance - this will fail if BaseWizardProps changes
        validateBaseWizardProps(promptStep.props);
        
        expect(promptStep.props.inError).toBe(false);
        // These properties are undefined by default in DEFAULT_STEP_INFO
        expect(promptStep.props.maxPromptTemplateLength).toBeUndefined();
        expect(promptStep.props.maxInputTextLength).toBeUndefined();
        expect(promptStep.props.promptTemplate).toBeUndefined();
        expect(promptStep.props.rephraseQuestion).toBeUndefined();
        expect(promptStep.props.userPromptEditingEnabled).toBe(true);
        expect(promptStep.props.chatHistoryLength).toBeUndefined();
        expect(promptStep.props.humanPrefix).toBeUndefined();
        expect(promptStep.props.aiPrefix).toBeUndefined();
        expect(promptStep.props.disambiguationEnabled).toBeUndefined();
        expect(promptStep.props.disambiguationPromptTemplate).toBeUndefined();
    });

    test('implements BaseWizardProps interface correctly', () => {
        // This test ensures that if BaseWizardProps interface changes, 
        // the test will fail and force developers to update implementations
        testBaseWizardPropsCompliance(promptStep);
    });

    test('has correct tool content', () => {
        expect(promptStep.toolContent.title).toBe('Prompt selection');
        expect(promptStep.toolContent.content).toBeDefined();
        expect(promptStep.toolContent.links).toBeDefined();
        expect(promptStep.toolContent.links.length).toBeGreaterThan(0);
    });

    test('has content generator function', () => {
        expect(typeof promptStep.contentGenerator).toBe('function');
    });

    test('visibility is initially null', () => {
        expect(promptStep.visibility).toBeNull();
    });

    describe('mapStepInfoFromDeployment', () => {
        test('maps deployment info correctly', () => {
            const mockDeployment = {
                LlmParams: {
                    PromptParams: {
                        PromptTemplate: 'Test prompt template',
                        MaxPromptTemplateLength: 5000,
                        MaxInputTextLength: 2000,
                        RephraseQuestion: true,
                        UserPromptEditingEnabled: false,
                        DisambiguationEnabled: true,
                        DisambiguationPromptTemplate: 'Test disambiguation'
                    },
                    ModelParams: {
                        Temperature: 0.7
                    }
                },
                ConversationMemoryParams: {
                    ChatHistoryLength: 10,
                    HumanPrefix: 'Human',
                    AiPrefix: 'Assistant'
                }
            };

            promptStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(promptStep.props.promptTemplate).toBe('Test prompt template');
            expect(promptStep.props.maxPromptTemplateLength).toBe(5000);
            expect(promptStep.props.maxInputTextLength).toBe(2000);
            expect(promptStep.props.rephraseQuestion).toBe(true);
            expect(promptStep.props.userPromptEditingEnabled).toBe(false);
            expect(promptStep.props.disambiguationEnabled).toBe(true);
            expect(promptStep.props.disambiguationPromptTemplate).toBe('Test disambiguation');
            expect(promptStep.props.chatHistoryLength).toBe(10);
            expect(promptStep.props.humanPrefix).toBe('Human');
            expect(promptStep.props.aiPrefix).toBe('Assistant');
        });

        test('handles empty deployment data', () => {
            const originalProps = { ...promptStep.props };
            
            expect(() => {
                promptStep.mapStepInfoFromDeployment(null, DEPLOYMENT_ACTIONS.EDIT);
            }).toThrow();

            // Props should remain unchanged when error occurs
            expect(promptStep.props).toEqual(originalProps);
        });

        test('handles deployment without prompt params', () => {
            const originalProps = { ...promptStep.props };
            
            expect(() => {
                promptStep.mapStepInfoFromDeployment({}, DEPLOYMENT_ACTIONS.EDIT);
            }).toThrow();

            // Props should remain unchanged when error occurs
            expect(promptStep.props).toEqual(originalProps);
        });
    });
});