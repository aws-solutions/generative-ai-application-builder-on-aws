// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { cloudscapeRender } from '@/utils';
import { WorkflowConfigReview } from '../WorkflowConfigReview';

// Mock utility functions and components
vi.mock('../utils', () => ({
    getBooleanString: vi.fn((value: boolean) => (value ? 'Yes' : 'No'))
}));

vi.mock('@/utils/displayUtils', () => ({
    escapedNewLineToLineBreakTag: vi.fn((text: string, componentId: string) => (
        <span data-testid="escaped-text" data-component-id={componentId}>
            {text}
        </span>
    ))
}));

vi.mock('@/utils/constants', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        ORCHESTRATION_PATTERNS: new Map([
            ['SUPERVISOR', { name: 'Supervisor Pattern', description: 'Supervisor orchestration pattern' }],
            ['SEQUENTIAL', { name: 'Sequential Pattern', description: 'Sequential orchestration pattern' }],
            ['HIERARCHICAL', { name: 'Hierarchical Pattern', description: 'Hierarchical orchestration pattern' }]
        ])
    };
});

vi.mock('@/components/commons/external-link', () => ({
    ExternalLink: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href} data-testid="external-link">
            {children}
        </a>
    )
}));

vi.mock('@/utils/ValueWithLabel', () => ({
    ValueWithLabel: ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div data-testid="value-with-label">
            <span data-testid="label">{label}</span>
            <span data-testid="value">{children}</span>
        </div>
    )
}));

describe('WorkflowConfigReview', () => {
    const defaultProps = {
        header: 'Test Workflow Configuration',
        workflowData: {
            systemPrompt: '',
            memoryEnabled: false,
            orchestrationPattern: '',
            selectedAgents: []
        },
        setActiveStepIndex: vi.fn()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders with basic props', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<WorkflowConfigReview {...defaultProps} />);

            expect(screen.getByText('Test Workflow Configuration')).toBeInTheDocument();
            expect(screen.getByText('Client agent configuration')).toBeInTheDocument();
            expect(screen.getByText('Multi-agent configuration')).toBeInTheDocument();
        });

        test('renders header with correct variant', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<WorkflowConfigReview {...defaultProps} />);

            const header = cloudscapeWrapper.findHeader();
            expect(header).toBeDefined();
            expect(screen.getByText('Test Workflow Configuration')).toBeInTheDocument();
        });

        test('renders all required containers', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<WorkflowConfigReview {...defaultProps} />);

            expect(screen.getByTestId('review-client-agent-container')).toBeInTheDocument();
            expect(screen.getByTestId('review-multiagent-container')).toBeInTheDocument();
            expect(screen.getByTestId('review-client-agent-details')).toBeInTheDocument();
            expect(screen.getByTestId('review-multiagent-details')).toBeInTheDocument();
        });
    });

    describe('Edit Button', () => {
        test('renders edit button', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<WorkflowConfigReview {...defaultProps} />);

            const editButton = cloudscapeWrapper.findButton();
            expect(editButton).toBeDefined();
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });

        test('calls setActiveStepIndex with step 3 when clicked', () => {
            const mockSetActiveStepIndex = vi.fn();
            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} setActiveStepIndex={mockSetActiveStepIndex} />
            );

            const editButton = cloudscapeWrapper.findButton();
            editButton?.click();

            expect(mockSetActiveStepIndex).toHaveBeenCalledWith(2);
        });
    });

    describe('Client Agent Configuration', () => {
        test('displays system prompt when provided', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                systemPrompt: 'You are a helpful workflow assistant'
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            expect(labels.some((label) => label.textContent === 'System prompt')).toBe(true);
            
            const escapedText = screen.getByTestId('escaped-text');
            expect(escapedText).toHaveTextContent('You are a helpful workflow assistant');
        });

        test('displays empty system prompt', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                systemPrompt: ''
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            expect(labels.some((label) => label.textContent === 'System prompt')).toBe(true);
        });

        test('displays memory enabled as Yes', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                memoryEnabled: true
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Memory enabled')).toBe(true);
            expect(values.some((value) => value.textContent === 'Yes')).toBe(true);
        });

        test('displays memory disabled as No', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                memoryEnabled: false
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Memory enabled')).toBe(true);
            expect(values.some((value) => value.textContent === 'No')).toBe(true);
        });

        test('renders system prompt in code box', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                systemPrompt: 'Test system prompt'
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const box = cloudscapeWrapper.findBox();
            expect(box).toBeDefined();
        });
    });

    describe('Multi-Agent Configuration', () => {
        test('displays orchestration pattern with mapped name', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                orchestrationPattern: 'SUPERVISOR'
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Orchestration pattern')).toBe(true);
            expect(values.some((value) => value.textContent === 'Supervisor Pattern')).toBe(true);
        });

        test('displays orchestration pattern without mapping', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                orchestrationPattern: 'UNKNOWN_PATTERN'
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Orchestration pattern')).toBe(true);
            expect(values.some((value) => value.textContent === 'UNKNOWN_PATTERN')).toBe(true);
        });

        test('displays number of selected agents when agents exist', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: [
                    { useCaseId: 'agent-1', useCaseName: 'Agent 1' },
                    { useCaseId: 'agent-2', useCaseName: 'Agent 2' }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Number of selected agents')).toBe(true);
            expect(values.some((value) => value.textContent === '2')).toBe(true);
        });

        test('displays zero agents when no agents selected', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: []
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Number of selected agents')).toBe(true);
            expect(values.some((value) => value.textContent === '0')).toBe(true);
        });

        test('displays zero agents when selectedAgents is null', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: null
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Number of selected agents')).toBe(true);
            expect(values.some((value) => value.textContent === '0')).toBe(true);
        });

        test('displays zero agents when selectedAgents is undefined', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: undefined
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Number of selected agents')).toBe(true);
            expect(values.some((value) => value.textContent === '0')).toBe(true);
        });
    });

    describe('Selected Agents Section', () => {
        test('does not render selected agents container when no agents', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: []
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            expect(screen.queryByTestId('review-selected-agents-container')).not.toBeInTheDocument();
        });

        test('does not render selected agents container when selectedAgents is null', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: null
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            expect(screen.queryByTestId('review-selected-agents-container')).not.toBeInTheDocument();
        });

        test('renders selected agents container when agents exist', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: [
                    {
                        useCaseId: 'agent-1',
                        useCaseName: 'Data Analysis Agent',
                        useCaseDescription: 'Analyzes data and provides insights'
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            expect(screen.getByTestId('review-selected-agents-container')).toBeInTheDocument();
            expect(screen.getByText('Selected agents')).toBeInTheDocument();
        });

        test('renders agent details with external links', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: [
                    {
                        useCaseId: 'agent-1',
                        useCaseName: 'Data Analysis Agent',
                        useCaseDescription: 'Analyzes data and provides insights',
                        useCaseType: 'AgentBuilder'
                    },
                    {
                        useCaseId: 'agent-2',
                        useCaseName: 'Report Generator',
                        useCaseDescription: 'Generates comprehensive reports',
                        useCaseType: 'AgentBuilder'
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            expect(screen.getByText('Data Analysis Agent')).toBeInTheDocument();
            expect(screen.getByText('Analyzes data and provides insights')).toBeInTheDocument();
            expect(screen.getByText('Report Generator')).toBeInTheDocument();
            expect(screen.getByText('Generates comprehensive reports')).toBeInTheDocument();

            const externalLinks = screen.getAllByTestId('external-link');
            expect(externalLinks).toHaveLength(2);
            expect(externalLinks[0]).toHaveAttribute('href', '/deployment-details/AgentBuilder/agent-1');
            expect(externalLinks[1]).toHaveAttribute('href', '/deployment-details/AgentBuilder/agent-2');
        });

        test('renders agent with default description when description is missing', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: [
                    {
                        useCaseId: 'agent-1',
                        useCaseName: 'Test Agent'
                        // useCaseDescription is missing
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            expect(screen.getByText('Test Agent')).toBeInTheDocument();
            expect(screen.getByText('No description is available.')).toBeInTheDocument();
        });

        test('renders agent with empty description', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: [
                    {
                        useCaseId: 'agent-1',
                        useCaseName: 'Test Agent',
                        useCaseDescription: ''
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            expect(screen.getByText('Test Agent')).toBeInTheDocument();
            expect(screen.getByText('No description is available.')).toBeInTheDocument();
        });

        test('uses index as key when useCaseId is missing', () => {
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: [
                    {
                        // useCaseId is missing
                        useCaseName: 'Test Agent',
                        useCaseDescription: 'Test description'
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            expect(screen.getByText('Test Agent')).toBeInTheDocument();
            expect(screen.getByText('Test description')).toBeInTheDocument();
        });
    });

    describe('Complex Scenarios', () => {
        test('displays all data when fully configured', () => {
            const workflowData = {
                systemPrompt: 'You are a comprehensive workflow assistant',
                memoryEnabled: true,
                orchestrationPattern: 'SUPERVISOR',
                selectedAgents: [
                    {
                        useCaseId: 'agent-1',
                        useCaseName: 'Data Analysis Agent',
                        useCaseDescription: 'Analyzes data and provides insights'
                    },
                    {
                        useCaseId: 'agent-2',
                        useCaseName: 'Report Generator',
                        useCaseDescription: 'Generates comprehensive reports'
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            // Client agent configuration
            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'System prompt')).toBe(true);
            const escapedText = screen.getByTestId('escaped-text');
            expect(escapedText).toHaveTextContent('You are a comprehensive workflow assistant');
            
            expect(labels.some((label) => label.textContent === 'Memory enabled')).toBe(true);
            expect(values.some((value) => value.textContent === 'Yes')).toBe(true);

            // Multi-agent configuration
            expect(labels.some((label) => label.textContent === 'Orchestration pattern')).toBe(true);
            expect(values.some((value) => value.textContent === 'Supervisor Pattern')).toBe(true);
            expect(labels.some((label) => label.textContent === 'Number of selected agents')).toBe(true);
            expect(values.some((value) => value.textContent === '2')).toBe(true);

            // Selected agents
            expect(screen.getByTestId('review-selected-agents-container')).toBeInTheDocument();
            expect(screen.getByText('Data Analysis Agent')).toBeInTheDocument();
            expect(screen.getByText('Report Generator')).toBeInTheDocument();
        });

        test('handles mixed configuration with some empty values', () => {
            const workflowData = {
                systemPrompt: '',
                memoryEnabled: false,
                orchestrationPattern: 'SEQUENTIAL',
                selectedAgents: [
                    {
                        useCaseId: 'agent-1',
                        useCaseName: 'Single Agent',
                        useCaseDescription: 'The only agent'
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            // Empty system prompt still shows
            expect(labels.some((label) => label.textContent === 'System prompt')).toBe(true);

            // Memory disabled
            expect(labels.some((label) => label.textContent === 'Memory enabled')).toBe(true);
            expect(values.some((value) => value.textContent === 'No')).toBe(true);

            // Orchestration pattern
            expect(labels.some((label) => label.textContent === 'Orchestration pattern')).toBe(true);
            expect(values.some((value) => value.textContent === 'Sequential Pattern')).toBe(true);

            // One agent
            expect(labels.some((label) => label.textContent === 'Number of selected agents')).toBe(true);
            expect(values.some((value) => value.textContent === '1')).toBe(true);
            expect(screen.getByText('Single Agent')).toBeInTheDocument();
        });

        test('handles completely empty configuration', () => {
            const workflowData = {
                systemPrompt: '',
                memoryEnabled: false,
                orchestrationPattern: '',
                selectedAgents: []
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Memory enabled')).toBe(true);
            expect(values.some((value) => value.textContent === 'No')).toBe(true);
            expect(labels.some((label) => label.textContent === 'Number of selected agents')).toBe(true);
            expect(values.some((value) => value.textContent === '0')).toBe(true);
            expect(screen.queryByTestId('review-selected-agents-container')).not.toBeInTheDocument();
        });
    });

    describe('Component Structure', () => {
        test('renders header with actions correctly', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<WorkflowConfigReview {...defaultProps} />);

            const header = cloudscapeWrapper.findHeader();
            expect(header).toBeDefined();
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });

        test('renders containers with correct headers', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<WorkflowConfigReview {...defaultProps} />);

            expect(screen.getByText('Client agent configuration')).toBeInTheDocument();
            expect(screen.getByText('Multi-agent configuration')).toBeInTheDocument();
        });

        test('renders column layouts with correct variants', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<WorkflowConfigReview {...defaultProps} />);

            const columnLayout = cloudscapeWrapper.findColumnLayout();
            expect(columnLayout).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        test('handles workflowData with missing properties', () => {
            const workflowData = {}; // Empty object

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            // Component should render but may show undefined/null values
            expect(screen.getByText('Test Workflow Configuration')).toBeInTheDocument();
            expect(screen.getByText('Client agent configuration')).toBeInTheDocument();
            expect(screen.getByText('Multi-agent configuration')).toBeInTheDocument();
        });

        test('handles workflowData with null values', () => {
            const workflowData = {
                systemPrompt: null,
                memoryEnabled: null,
                orchestrationPattern: null,
                selectedAgents: null
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            expect(screen.getByText('Test Workflow Configuration')).toBeInTheDocument();
            expect(screen.queryByTestId('review-selected-agents-container')).not.toBeInTheDocument();
        });

        test('handles very long system prompt', () => {
            const longPrompt = 'A'.repeat(1000);
            const workflowData = {
                ...defaultProps.workflowData,
                systemPrompt: longPrompt
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const escapedText = screen.getByTestId('escaped-text');
            expect(escapedText).toHaveTextContent(longPrompt);
        });

        test('handles system prompt with special characters', () => {
            const specialPrompt = 'You are a "helpful" assistant with <special> characters & symbols!';
            const workflowData = {
                ...defaultProps.workflowData,
                systemPrompt: specialPrompt
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const escapedText = screen.getByTestId('escaped-text');
            expect(escapedText).toHaveTextContent(specialPrompt);
        });

        test('handles agents with very long names and descriptions', () => {
            const longName = 'A'.repeat(100);
            const longDescription = 'B'.repeat(500);
            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: [
                    {
                        useCaseId: 'agent-1',
                        useCaseName: longName,
                        useCaseDescription: longDescription
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            expect(screen.getByText(longName)).toBeInTheDocument();
            expect(screen.getByText(longDescription)).toBeInTheDocument();
        });

        test('handles large number of selected agents', () => {
            const manyAgents = Array.from({ length: 10 }, (_, i) => ({
                useCaseId: `agent-${i}`,
                useCaseName: `Agent ${i}`,
                useCaseDescription: `Description for agent ${i}`
            }));

            const workflowData = {
                ...defaultProps.workflowData,
                selectedAgents: manyAgents
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <WorkflowConfigReview {...defaultProps} workflowData={workflowData} />
            );

            const labels = screen.getAllByTestId('label');
            const values = screen.getAllByTestId('value');

            expect(labels.some((label) => label.textContent === 'Number of selected agents')).toBe(true);
            expect(values.some((value) => value.textContent === '10')).toBe(true);

            // Check that all agents are rendered
            manyAgents.forEach((agent, i) => {
                expect(screen.getByText(`Agent ${i}`)).toBeInTheDocument();
                expect(screen.getByText(`Description for agent ${i}`)).toBeInTheDocument();
            });
        });
    });
});
