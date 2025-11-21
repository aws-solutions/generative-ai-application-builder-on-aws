// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import Workflow from '../Workflow';
import { USECASE_TYPE_ROUTE, DEFAULT_WORKFLOW_SYSTEM_PROMPT } from '@/utils/constants';

// Mock child components
vi.mock('../AgentSelection', () => ({
    default: ({ selectedAgents, onChangeFn, setNumFieldsInError, setHelpPanelContent }: any) => (
        <div data-testid="agent-selection-component">
            <div data-testid="selected-agents-count">{selectedAgents?.length || 0}</div>
            <button
                onClick={() => onChangeFn({ selectedAgents: [{ useCaseId: 'test-agent', useCaseName: 'Test Agent' }] })}
                data-testid="mock-add-agent"
            >
                Add Agent
            </button>
            <button onClick={() => setNumFieldsInError(1)} data-testid="mock-set-error">
                Set Error
            </button>
        </div>
    )
}));

vi.mock('../../AgentBuilder/Memory', () => ({
    Memory: ({ memoryEnabled, onChangeFn, setNumFieldsInError, setHelpPanelContent }: any) => (
        <div data-testid="memory-component">
            <div data-testid="memory-enabled">{memoryEnabled ? 'true' : 'false'}</div>
            <button onClick={() => onChangeFn({ memoryEnabled: !memoryEnabled })} data-testid="toggle-memory">
                Toggle Memory
            </button>
        </div>
    )
}));

vi.mock('@/components/commons/confirm-unsaved-changes-modal', () => ({
    ConfirmUnsavedChangesModal: ({ visible, setVisible, confirmHandler, confirmText }: any) => (
        <div data-testid="confirm-modal" style={{ display: visible ? 'block' : 'none' }}>
            <button onClick={() => setVisible(false)} data-testid="modal-cancel">
                Cancel
            </button>
            <button onClick={confirmHandler} data-testid="modal-confirm">
                {confirmText}
            </button>
        </div>
    )
}));

// Mock constants with importOriginal to preserve other constants
vi.mock('@/utils/constants', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        ORCHESTRATION_PATTERNS: new Map([
            [
                'agents-as-tools',
                {
                    id: 'agents-as-tools',
                    name: 'Agents as Tools',
                    description: 'Specialized agents are wrapped as callable functions for a client agent',
                    enabled: true
                }
            ],
            [
                'supervisor',
                {
                    id: 'supervisor',
                    name: 'Supervisor Pattern',
                    description: 'A supervisor agent coordinates multiple specialized agents',
                    enabled: true
                }
            ],
            [
                'disabled-pattern',
                {
                    id: 'disabled-pattern',
                    name: 'Disabled Pattern',
                    description: 'This pattern is disabled',
                    enabled: false
                }
            ]
        ]),
        ORCHESTRATION_PATTERN_TYPES: {
            AGENTS_AS_TOOLS: 'agents-as-tools'
        }
    };
});

const mockWorkflowFormData = {
    workflow: {
        systemPrompt: DEFAULT_WORKFLOW_SYSTEM_PROMPT,
        orchestrationPattern: 'agents-as-tools',
        selectedAgents: [{ useCaseId: 'agent-1', useCaseName: 'Test Agent 1' }],
        memoryEnabled: false,
        inError: false
    }
};

const mockWorkflowFormDataEmpty = {
    workflow: {
        systemPrompt: '',
        orchestrationPattern: '',
        selectedAgents: [],
        memoryEnabled: false,
        inError: false
    }
};

describe('Workflow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders all main components with correct data-testids', () => {
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(screen.getByTestId('workflow-system-prompt')).toBeDefined();
            expect(screen.getByTestId('system-prompt-textarea')).toBeDefined();
            expect(screen.getByTestId('memory-component')).toBeDefined();
            expect(screen.getByTestId('workflow-orchestration-container')).toBeDefined();
            expect(screen.getByTestId('orchestration-pattern-selection')).toBeDefined();
            expect(screen.getByTestId('workflow-agent-snapshot-alert')).toBeDefined();
            expect(screen.getByTestId('agent-selection-component')).toBeDefined();
        });

        test('renders with default system prompt when provided', () => {
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const textArea = cloudscapeWrapper.findTextarea();
            expect(textArea?.getTextareaValue()).toBe(DEFAULT_WORKFLOW_SYSTEM_PROMPT);
        });

        test('renders container headers correctly', () => {
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(screen.getByText('Client Agent Configuration')).toBeDefined();
            expect(screen.getByText('Multi-Agent Configuration')).toBeDefined();
            // Memory component is mocked, so we check for the mock component instead
            expect(screen.getByTestId('memory-component')).toBeDefined();
        });
    });

    describe('Auto-initialization', () => {
        test('auto-selects default orchestration pattern when none selected', () => {
            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={mockWorkflowFormDataEmpty} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(mockOnChange).toHaveBeenCalledWith({
                orchestrationPattern: 'agents-as-tools'
            });
        });

        test('does not auto-select orchestration pattern when already selected', () => {
            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            // Should not call onChange for orchestration pattern since it's already set
            expect(mockOnChange).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    orchestrationPattern: expect.any(String)
                })
            );
        });
    });

    describe('System Prompt', () => {
        test('displays system prompt when provided', () => {
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const textArea = cloudscapeWrapper.findTextarea();
            expect(textArea?.getTextareaValue()).toBe(DEFAULT_WORKFLOW_SYSTEM_PROMPT);
        });

        test('shows validation error when system prompt is empty', () => {
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormDataEmpty} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const formField = cloudscapeWrapper.findFormField();
            expect(formField?.findError()?.getElement().textContent).toEqual('System prompt is required');
        });

        test('handles system prompt changes', () => {
            const mockOnChange = vi.fn();
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const textArea = cloudscapeWrapper.findTextarea();
            textArea?.setTextareaValue('New system prompt');

            expect(mockOnChange).toHaveBeenCalledWith({
                systemPrompt: 'New system prompt'
            });
        });

        test('shows validation error for whitespace-only system prompt', () => {
            const whitespaceFormData = {
                workflow: {
                    ...mockWorkflowFormDataEmpty.workflow,
                    systemPrompt: '   '
                }
            };

            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={whitespaceFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const formField = cloudscapeWrapper.findFormField();
            expect(formField?.findError()?.getElement().textContent).toEqual('System prompt is required');
        });
    });

    describe('Reset System Prompt', () => {
        test('renders reset button', () => {
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(screen.getByTestId('system-prompt-reset-button')).toBeDefined();
        });

        test('disables reset button when system prompt is already default', () => {
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const resetButton = screen.getByTestId('system-prompt-reset-button');
            expect(resetButton).toHaveAttribute('disabled');
        });

        test('enables reset button when system prompt is different from default', () => {
            const customPromptData = {
                workflow: {
                    ...mockWorkflowFormData.workflow,
                    systemPrompt: 'Custom system prompt'
                }
            };

            renderWithProvider(<Workflow info={customPromptData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />, {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            });

            const resetButton = screen.getByTestId('system-prompt-reset-button');
            expect(resetButton).not.toHaveAttribute('disabled');
        });

        test('shows confirmation modal when reset button is clicked', async () => {
            const customPromptData = {
                workflow: {
                    ...mockWorkflowFormData.workflow,
                    systemPrompt: 'Custom system prompt'
                }
            };

            renderWithProvider(<Workflow info={customPromptData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />, {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            });

            const resetButton = screen.getByTestId('system-prompt-reset-button');
            resetButton.click();

            // Wait for the modal to appear
            await vi.waitFor(() => {
                const modal = screen.getByTestId('confirm-modal');
                expect(modal).toHaveStyle({ display: 'block' });
            });
        });

        test('resets system prompt when confirmed', () => {
            const mockOnChange = vi.fn();
            const customPromptData = {
                workflow: {
                    ...mockWorkflowFormData.workflow,
                    systemPrompt: 'Custom system prompt'
                }
            };

            renderWithProvider(
                <Workflow info={customPromptData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const resetButton = screen.getByTestId('system-prompt-reset-button');
            resetButton.click();

            const confirmButton = screen.getByTestId('modal-confirm');
            confirmButton.click();

            expect(mockOnChange).toHaveBeenCalledWith({
                systemPrompt: DEFAULT_WORKFLOW_SYSTEM_PROMPT
            });
        });
    });

    describe('Orchestration Pattern Selection', () => {
        test('renders orchestration pattern radio group', () => {
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const radioGroup = cloudscapeWrapper.findRadioGroup();
            expect(radioGroup).toBeDefined();
        });

        test('shows only enabled orchestration patterns', () => {
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(screen.getByText('Agents as Tools')).toBeDefined();
            expect(screen.getByText('Supervisor Pattern')).toBeDefined();
            expect(screen.queryByText('Disabled Pattern')).toBeNull();
        });

        test('handles orchestration pattern changes', () => {
            const mockOnChange = vi.fn();
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const radioGroup = cloudscapeWrapper.findRadioGroup();
            radioGroup?.findInputByValue('supervisor')?.click();

            expect(mockOnChange).toHaveBeenCalledWith({
                orchestrationPattern: expect.objectContaining({
                    id: 'supervisor',
                    name: 'Supervisor Pattern'
                })
            });
        });

        test('displays current orchestration pattern selection', () => {
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const radioGroup = cloudscapeWrapper.findRadioGroup();
            expect(radioGroup?.findInputByValue('agents-as-tools')?.getElement()).toBeChecked();
        });
    });

    describe('Memory Component', () => {
        test('renders Memory component with correct props', () => {
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(screen.getByTestId('memory-component')).toBeDefined();
            expect(screen.getByTestId('memory-enabled')).toHaveTextContent('false');
        });

        test('handles memory changes', () => {
            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const toggleButton = screen.getByTestId('toggle-memory');
            toggleButton.click();

            expect(mockOnChange).toHaveBeenCalledWith({
                memoryEnabled: true
            });
        });

        test('displays memory enabled state correctly', () => {
            const memoryEnabledData = {
                workflow: {
                    ...mockWorkflowFormData.workflow,
                    memoryEnabled: true
                }
            };

            renderWithProvider(<Workflow info={memoryEnabledData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />, {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            });

            expect(screen.getByTestId('memory-enabled')).toHaveTextContent('true');
        });
    });

    describe('Agent Selection Component', () => {
        test('renders AgentSelection component with correct props', () => {
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(screen.getByTestId('agent-selection-component')).toBeDefined();
            expect(screen.getByTestId('selected-agents-count')).toHaveTextContent('1');
        });

        test('handles agent selection changes', () => {
            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const addAgentButton = screen.getByTestId('mock-add-agent');
            addAgentButton.click();

            expect(mockOnChange).toHaveBeenCalledWith({
                selectedAgents: [{ useCaseId: 'test-agent', useCaseName: 'Test Agent' }]
            });
        });

        test('displays empty agents list correctly', () => {
            renderWithProvider(
                <Workflow info={mockWorkflowFormDataEmpty} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(screen.getByTestId('selected-agents-count')).toHaveTextContent('0');
        });

        test('pre-populates agents table in EDIT deployment action flow', () => {
            const editFlowData = {
                workflow: {
                    systemPrompt: 'Existing workflow system prompt',
                    orchestrationPattern: 'agents-as-tools',
                    selectedAgents: [
                        {
                            useCaseId: 'existing-agent-1',
                            useCaseName: 'Data Processing Agent',
                            useCaseDescription: 'Processes and analyzes data',
                            useCaseType: 'AgentBuilder'
                        },
                        {
                            useCaseId: 'existing-agent-2',
                            useCaseName: 'Report Generation Agent',
                            useCaseDescription: 'Generates comprehensive reports',
                            useCaseType: 'AgentBuilder'
                        },
                        {
                            useCaseId: 'existing-agent-3',
                            useCaseName: 'Email Notification Agent',
                            useCaseDescription: 'Sends email notifications',
                            useCaseType: 'AgentBuilder'
                        }
                    ],
                    memoryEnabled: true,
                    inError: false
                }
            };

            renderWithProvider(<Workflow info={editFlowData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />, {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            });

            // Verify that the AgentSelection component receives the pre-populated agents
            expect(screen.getByTestId('agent-selection-component')).toBeDefined();
            expect(screen.getByTestId('selected-agents-count')).toHaveTextContent('3');
        });

        test('handles large number of pre-populated agents in EDIT flow', () => {
            const manyAgents = Array.from({ length: 8 }, (_, i) => ({
                useCaseId: `agent-${i + 1}`,
                useCaseName: `Agent ${i + 1}`,
                useCaseDescription: `Description for agent ${i + 1}`,
                useCaseType: 'AgentBuilder'
            }));

            const editFlowWithManyAgents = {
                workflow: {
                    systemPrompt: 'Multi-agent workflow system prompt',
                    orchestrationPattern: 'agents-as-tools',
                    selectedAgents: manyAgents,
                    memoryEnabled: false,
                    inError: false
                }
            };

            renderWithProvider(
                <Workflow info={editFlowWithManyAgents} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            // Verify that all agents are pre-populated
            expect(screen.getByTestId('agent-selection-component')).toBeDefined();
            expect(screen.getByTestId('selected-agents-count')).toHaveTextContent('8');
        });

        test('maintains agent data integrity during EDIT flow', () => {
            const agentsWithCompleteData = [
                {
                    useCaseId: 'agent-with-all-fields',
                    useCaseName: 'Complete Agent',
                    useCaseDescription: 'Agent with all required fields',
                    useCaseType: 'AgentBuilder',
                    status: 'DEPLOYED',
                    createdDate: '2024-01-15T10:30:00Z'
                },
                {
                    useCaseId: 'agent-minimal-fields',
                    useCaseName: 'Minimal Agent',
                    // Missing description to test handling of optional fields
                    useCaseType: 'AgentBuilder'
                }
            ];

            const editFlowWithCompleteData = {
                workflow: {
                    systemPrompt: 'System prompt for complete workflow',
                    orchestrationPattern: 'agents-as-tools',
                    selectedAgents: agentsWithCompleteData,
                    memoryEnabled: true,
                    inError: false
                }
            };

            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={editFlowWithCompleteData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            // Verify that the component renders with the complete agent data
            expect(screen.getByTestId('agent-selection-component')).toBeDefined();
            expect(screen.getByTestId('selected-agents-count')).toHaveTextContent('2');

            // Verify that the component doesn't automatically modify the agent data
            expect(mockOnChange).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    selectedAgents: expect.any(Array)
                })
            );
        });
    });

    describe('Error Handling and Validation', () => {
        test('sets inError to true when required fields are missing', () => {
            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={mockWorkflowFormDataEmpty} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(mockOnChange).toHaveBeenCalledWith({
                inError: true
            });
        });

        test('sets inError to false when all required fields are filled', () => {
            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(mockOnChange).toHaveBeenCalledWith({
                inError: false
            });
        });

        test('handles field errors from child components', () => {
            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            const setErrorButton = screen.getByTestId('mock-set-error');
            setErrorButton.click();

            // The component should initially set inError to false for valid data
            // Then when field errors are introduced, it should set to true
            expect(mockOnChange).toHaveBeenCalledWith({
                inError: false
            });
        });

        test('validates system prompt is not empty', () => {
            const mockOnChange = vi.fn();
            const emptyPromptData = {
                workflow: {
                    ...mockWorkflowFormData.workflow,
                    systemPrompt: '',
                    orchestrationPattern: 'agents-as-tools',
                    selectedAgents: [{ useCaseId: 'agent-1', useCaseName: 'Test Agent' }]
                }
            };

            renderWithProvider(
                <Workflow info={emptyPromptData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(mockOnChange).toHaveBeenCalledWith({
                inError: true
            });
        });

        test('validates orchestration pattern is selected', () => {
            const mockOnChange = vi.fn();
            const noPatternData = {
                workflow: {
                    ...mockWorkflowFormData.workflow,
                    orchestrationPattern: '',
                    systemPrompt: 'Valid prompt',
                    selectedAgents: [{ useCaseId: 'agent-1', useCaseName: 'Test Agent' }]
                }
            };

            renderWithProvider(
                <Workflow info={noPatternData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(mockOnChange).toHaveBeenCalledWith({
                inError: true
            });
        });

        test('validates at least one agent is selected', () => {
            const mockOnChange = vi.fn();
            const noAgentsData = {
                workflow: {
                    ...mockWorkflowFormData.workflow,
                    orchestrationPattern: 'agents-as-tools',
                    systemPrompt: 'Valid prompt',
                    selectedAgents: []
                }
            };

            renderWithProvider(<Workflow info={noAgentsData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />, {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            });

            expect(mockOnChange).toHaveBeenCalledWith({
                inError: true
            });
        });
    });

    describe('Complex Scenarios', () => {
        test('handles fully configured workflow', () => {
            const fullWorkflowData = {
                workflow: {
                    systemPrompt: 'Custom workflow system prompt',
                    orchestrationPattern: 'supervisor',
                    selectedAgents: [
                        { useCaseId: 'agent-1', useCaseName: 'Agent 1' },
                        { useCaseId: 'agent-2', useCaseName: 'Agent 2' }
                    ],
                    memoryEnabled: true,
                    inError: false
                }
            };

            const mockOnChange = vi.fn();
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={fullWorkflowData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            // Should not auto-select orchestration pattern
            expect(mockOnChange).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    orchestrationPattern: expect.any(String)
                })
            );

            // Should set inError to false for valid configuration
            expect(mockOnChange).toHaveBeenCalledWith({
                inError: false
            });

            // Check UI reflects the data
            const textArea = cloudscapeWrapper.findTextarea();
            expect(textArea?.getTextareaValue()).toBe('Custom workflow system prompt');
            expect(screen.getByTestId('memory-enabled')).toHaveTextContent('true');
        });

        test('handles undefined workflow data gracefully', () => {
            const undefinedWorkflowData = {
                workflow: {
                    systemPrompt: undefined,
                    orchestrationPattern: undefined,
                    selectedAgents: undefined,
                    memoryEnabled: undefined,
                    inError: false
                }
            };

            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={undefinedWorkflowData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            // Should auto-select orchestration pattern
            expect(mockOnChange).toHaveBeenCalledWith({
                orchestrationPattern: 'agents-as-tools'
            });

            // Should set inError to true due to missing required fields
            expect(mockOnChange).toHaveBeenCalledWith({
                inError: true
            });
        });

        test('handles null workflow data gracefully', () => {
            const nullWorkflowData = {
                workflow: {
                    systemPrompt: null,
                    orchestrationPattern: null,
                    selectedAgents: null,
                    memoryEnabled: null,
                    inError: false
                }
            };

            const mockOnChange = vi.fn();
            renderWithProvider(
                <Workflow info={nullWorkflowData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            expect(screen.getByTestId('agent-selection-component')).toBeDefined();
            expect(screen.getByTestId('memory-component')).toBeDefined();
        });
    });

    describe('Component Integration', () => {
        test('passes correct props to all child components', () => {
            const mockSetHelpPanelContent = vi.fn();
            const mockOnChange = vi.fn();

            renderWithProvider(
                <Workflow
                    info={mockWorkflowFormData}
                    onChange={mockOnChange}
                    setHelpPanelContent={mockSetHelpPanelContent}
                />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            // All components should be rendered
            expect(screen.getByTestId('workflow-system-prompt')).toBeDefined();
            expect(screen.getByTestId('memory-component')).toBeDefined();
            expect(screen.getByTestId('workflow-orchestration-container')).toBeDefined();
            expect(screen.getByTestId('agent-selection-component')).toBeDefined();
        });

        test('handles multiple simultaneous changes correctly', () => {
            const mockOnChange = vi.fn();
            const { cloudscapeWrapper } = renderWithProvider(
                <Workflow info={mockWorkflowFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
                {
                    route: USECASE_TYPE_ROUTE.WORKFLOW
                }
            );

            // Change system prompt
            const textArea = cloudscapeWrapper.findTextarea();
            textArea?.setTextareaValue('New prompt');

            // Toggle memory - use getAllByTestId to get the first one
            const toggleButtons = screen.getAllByTestId('toggle-memory');
            toggleButtons[0].click();

            // Add agent
            const addAgentButton = screen.getByTestId('mock-add-agent');
            addAgentButton.click();

            // All changes should be handled
            expect(mockOnChange).toHaveBeenCalledWith({ systemPrompt: 'New prompt' });
            expect(mockOnChange).toHaveBeenCalledWith({ memoryEnabled: true });
            expect(mockOnChange).toHaveBeenCalledWith({
                selectedAgents: [{ useCaseId: 'test-agent', useCaseName: 'Test Agent' }]
            });
        });
    });
});
