// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { AgentStep } from '../AgentStep';
import { DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';
import { validateBaseWizardProps, testBaseWizardPropsCompliance } from './test-utils';

describe('AgentStep', () => {
    let agentStep: AgentStep;

    beforeEach(() => {
        agentStep = new AgentStep();
    });

    test('initializes with correct default properties', () => {
        expect(agentStep.id).toBe('agent');
        expect(agentStep.title).toBe('Select Agent');
        
        // Test BaseWizardProps compliance - this will fail if BaseWizardProps changes
        validateBaseWizardProps(agentStep.props);
        
        expect(agentStep.props.inError).toBe(false);
        expect(agentStep.props.bedrockAgentId).toBeDefined();
        expect(agentStep.props.bedrockAgentAliasId).toBeDefined();
        expect(agentStep.props.enableTrace).toBeDefined();
    });

    test('implements BaseWizardProps interface correctly', () => {
        // This test ensures that if BaseWizardProps interface changes, 
        // the test will fail and force developers to update implementations
        testBaseWizardPropsCompliance(agentStep);
    });

    test('has correct tool content', () => {
        expect(agentStep.toolContent.title).toBe('Agent selection');
        expect(agentStep.toolContent.content).toBeDefined();
        expect(agentStep.toolContent.links).toBeDefined();
        expect(agentStep.toolContent.links.length).toBeGreaterThan(0);
    });

    test('has content generator function', () => {
        expect(typeof agentStep.contentGenerator).toBe('function');
    });

    test('visibility is initially null', () => {
        expect(agentStep.visibility).toBeNull();
    });

    describe('mapStepInfoFromDeployment', () => {
        test('maps deployment info correctly', () => {
            const mockDeployment = {
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent-12345',
                        AgentAliasId: 'alias-67890',
                        EnableTrace: true
                    }
                }
            };

            agentStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(agentStep.props.bedrockAgentId).toBe('agent-12345');
            expect(agentStep.props.bedrockAgentAliasId).toBe('alias-67890');
            expect(agentStep.props.enableTrace).toBe(true);
        });

        test('handles deployment with trace disabled', () => {
            const mockDeployment = {
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent-test',
                        AgentAliasId: 'alias-test',
                        EnableTrace: false
                    }
                }
            };

            agentStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(agentStep.props.bedrockAgentId).toBe('agent-test');
            expect(agentStep.props.bedrockAgentAliasId).toBe('alias-test');
            expect(agentStep.props.enableTrace).toBe(false);
        });

        test('handles empty deployment data', () => {
            const originalProps = { ...agentStep.props };
            
            expect(() => {
                agentStep.mapStepInfoFromDeployment(null, DEPLOYMENT_ACTIONS.EDIT);
            }).toThrow();

            // Props should remain unchanged when error occurs
            expect(agentStep.props).toEqual(originalProps);
        });

        test('handles deployment without agent params', () => {
            const originalProps = { ...agentStep.props };
            
            expect(() => {
                agentStep.mapStepInfoFromDeployment({}, DEPLOYMENT_ACTIONS.EDIT);
            }).toThrow();

            // Props should remain unchanged when error occurs
            expect(agentStep.props).toEqual(originalProps);
        });

        test('handles partial agent configuration', () => {
            const mockDeployment = {
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent-partial',
                        AgentAliasId: undefined,
                        EnableTrace: undefined
                    }
                }
            };

            agentStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(agentStep.props.bedrockAgentId).toBe('agent-partial');
            expect(agentStep.props.bedrockAgentAliasId).toBeUndefined();
            expect(agentStep.props.enableTrace).toBeUndefined();
        });
    });
});