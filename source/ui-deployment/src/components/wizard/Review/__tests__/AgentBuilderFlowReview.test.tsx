// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import AgentBuilderFlowReview from '../AgentBuilderFlowReview';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('AgentBuilderFlowReview', () => {
    const mockSetActiveStepIndex = vi.fn();

    const mockReviewProps = {
        info: {
            useCase: {
                useCaseType: 'AgentBuilder',
                useCaseName: 'Test Agent Builder',
                useCaseDescription: 'A test agent for building applications',
                defaultUserEmail: 'test@example.com',
                deployUI: true,
                feedbackEnabled: false,
                existingUserPoolId: '',
                existingUserPoolClientId: ''
            },
            model: {
                modelProvider: { label: 'Bedrock', value: 'Bedrock' },
                modelName: 'amazon.titan-text-express-v1',
                temperature: 0.7,
                modelParameters: [],
                inError: false,
                verbose: false,
                streaming: false
            },
            agentBuilder: {
                systemPrompt: 'You are a helpful AI assistant',
                mcpServers: [{ name: 'server1', url: 'http://localhost:3000' }],
                tools: [{ name: 'calculator', type: 'function' }],
                memoryEnabled: true
            }
        },
        setActiveStepIndex: mockSetActiveStepIndex
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders agent builder flow review component', () => {
        renderWithProvider(<AgentBuilderFlowReview {...mockReviewProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId('agent-builder-review-deployment-component')).toBeDefined();
    });

    test('renders use case review section', () => {
        renderWithProvider(<AgentBuilderFlowReview {...mockReviewProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByText('Step 1: Use case')).toBeDefined();
        expect(screen.getByText('Test Agent Builder')).toBeDefined();
        expect(screen.getByText('A test agent for building applications')).toBeDefined();
    });

    test('renders agent builder review section', () => {
        renderWithProvider(<AgentBuilderFlowReview {...mockReviewProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByText('Step 2: Model')).toBeDefined();
        expect(screen.getByText('Step 3: Agent')).toBeDefined();
        expect(screen.getByTestId('agent-builder-key-value-display')).toBeDefined();
    });

    test('handles navigation back to use case step', () => {
        renderWithProvider(<AgentBuilderFlowReview {...mockReviewProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBeGreaterThan(0);

        // Click the first edit button (should be for use case)
        fireEvent.click(editButtons[0]);
        expect(mockSetActiveStepIndex).toHaveBeenCalledWith(0);
    });

    test('handles navigation back to model and agent builder steps', () => {
        renderWithProvider(<AgentBuilderFlowReview {...mockReviewProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBe(3); // Use case, model, and agent builder

        // Click the second edit button (should be for model)
        fireEvent.click(editButtons[1]);
        expect(mockSetActiveStepIndex).toHaveBeenCalledWith(1);

        // Click the third edit button (should be for agent builder)
        fireEvent.click(editButtons[2]);
        expect(mockSetActiveStepIndex).toHaveBeenCalledWith(2);
    });

    test('renders with minimal use case data', () => {
        const minimalProps = {
            info: {
                useCase: {
                    useCaseType: 'AgentBuilder',
                    useCaseName: '',
                    useCaseDescription: '',
                    defaultUserEmail: '',
                    deployUI: false,
                    feedbackEnabled: false,
                    existingUserPoolId: '',
                    existingUserPoolClientId: ''
                },
                model: {
                    modelProvider: { label: '', value: '' },
                    modelName: '',
                    temperature: 0.1,
                    modelParameters: [],
                    inError: false,
                    verbose: false,
                    streaming: false
                },
                agentBuilder: {
                    systemPrompt: '',
                    mcpServers: [],
                    tools: [],
                    memoryEnabled: false
                }
            },
            setActiveStepIndex: mockSetActiveStepIndex
        };

        renderWithProvider(<AgentBuilderFlowReview {...minimalProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId('agent-builder-review-deployment-component')).toBeDefined();
        expect(screen.getByText('Step 1: Use case')).toBeDefined();
        expect(screen.getByText('Step 3: Agent')).toBeDefined();
    });

    test('renders with empty agent builder data', () => {
        const emptyAgentBuilderProps = {
            info: {
                useCase: {
                    useCaseType: 'AgentBuilder',
                    useCaseName: 'Test Agent',
                    useCaseDescription: 'Test Description',
                    defaultUserEmail: '',
                    deployUI: true,
                    feedbackEnabled: false,
                    existingUserPoolId: '',
                    existingUserPoolClientId: ''
                },
                model: {
                    modelProvider: { label: '', value: '' },
                    modelName: '',
                    temperature: 0.1,
                    modelParameters: [],
                    inError: false,
                    verbose: false,
                    streaming: false
                },
                agentBuilder: {}
            },
            setActiveStepIndex: mockSetActiveStepIndex
        };

        renderWithProvider(<AgentBuilderFlowReview {...emptyAgentBuilderProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId('agent-builder-review-deployment-component')).toBeDefined();
        expect(screen.getByTestId('agent-builder-key-value-display')).toBeDefined();
    });

    test('renders with empty string data', () => {
        const nullDataProps = {
            info: {
                useCase: {
                    useCaseType: '',
                    useCaseName: '',
                    useCaseDescription: '',
                    defaultUserEmail: '',
                    deployUI: false,
                    feedbackEnabled: false,
                    existingUserPoolId: '',
                    existingUserPoolClientId: ''
                },
                model: {
                    modelProvider: { label: '', value: '' },
                    modelName: '',
                    temperature: 0.1,
                    modelParameters: [],
                    inError: false,
                    verbose: false,
                    streaming: false
                },
                agentBuilder: {
                    systemPrompt: '',
                    mcpServers: [],
                    tools: [],
                    memoryEnabled: false
                }
            },
            setActiveStepIndex: mockSetActiveStepIndex
        };

        renderWithProvider(<AgentBuilderFlowReview {...nullDataProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId('agent-builder-review-deployment-component')).toBeDefined();
    });
});
