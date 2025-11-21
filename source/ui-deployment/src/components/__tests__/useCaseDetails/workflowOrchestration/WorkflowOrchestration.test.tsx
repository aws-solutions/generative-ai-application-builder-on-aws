// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { WorkflowOrchestration } from '@/components/useCaseDetails/workflowOrchestration/WorkflowOrchestration';
import { cloudscapeRender } from '@/utils';

describe('WorkflowOrchestration', () => {
    const mockLoadHelpPanelContent = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders orchestration pattern with selected agents', () => {
        const mockSelectedDeployment = {
            WorkflowParams: {
                OrchestrationPattern: 'agents-as-tools',
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-123',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Support Agent',
                            UseCaseDescription: 'Handles customer support queries'
                        },
                        {
                            UseCaseId: 'agent-456',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Sales Agent',
                            UseCaseDescription: 'Handles sales inquiries'
                        }
                    ]
                }
            }
        };

        cloudscapeRender(
            <WorkflowOrchestration
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        // Check orchestration pattern
        expect(screen.getByText('Agents as Tools')).toBeInTheDocument();

        // Check selected agents container
        expect(screen.getByTestId('workflow-selected-agents-container')).toBeInTheDocument();
        expect(screen.getByText('Selected agents (2)')).toBeInTheDocument();

        // Check agent details
        expect(screen.getByText('Support Agent')).toBeInTheDocument();
        expect(screen.getByText('Handles customer support queries')).toBeInTheDocument();
        expect(screen.getByText('Sales Agent')).toBeInTheDocument();
        expect(screen.getByText('Handles sales inquiries')).toBeInTheDocument();
    });

    it('renders with no agents selected', () => {
        const mockSelectedDeployment = {
            WorkflowParams: {
                OrchestrationPattern: 'agents-as-tools',
                AgentsAsToolsParams: {
                    Agents: []
                }
            }
        };

        cloudscapeRender(
            <WorkflowOrchestration
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        expect(screen.getByText('Agents as Tools')).toBeInTheDocument();
        expect(screen.getByTestId('workflow-no-agents-container')).toBeInTheDocument();
        expect(screen.getByText('No agents have been selected for this workflow.')).toBeInTheDocument();
    });

    it('handles agents without descriptions', () => {
        const mockSelectedDeployment = {
            WorkflowParams: {
                OrchestrationPattern: 'agents-as-tools',
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-123',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Test Agent'
                        }
                    ]
                }
            }
        };

        cloudscapeRender(
            <WorkflowOrchestration
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        expect(screen.getByText('Test Agent')).toBeInTheDocument();
        expect(screen.getByText('No description is available.')).toBeInTheDocument();
    });

    it('handles agents without names', () => {
        const mockSelectedDeployment = {
            WorkflowParams: {
                OrchestrationPattern: 'agents-as-tools',
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-123',
                            UseCaseType: 'AgentBuilder'
                        }
                    ]
                }
            }
        };

        cloudscapeRender(
            <WorkflowOrchestration
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });

    it('handles missing WorkflowParams', () => {
        const mockSelectedDeployment = {};

        cloudscapeRender(
            <WorkflowOrchestration
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        expect(screen.getByText('Not configured')).toBeInTheDocument();
        expect(screen.getByTestId('workflow-no-agents-container')).toBeInTheDocument();
    });

    it('handles unknown orchestration pattern', () => {
        const mockSelectedDeployment = {
            WorkflowParams: {
                OrchestrationPattern: 'unknown-pattern',
                AgentsAsToolsParams: {
                    Agents: []
                }
            }
        };

        cloudscapeRender(
            <WorkflowOrchestration
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        expect(screen.getByText('unknown-pattern')).toBeInTheDocument();
    });

    it('renders orchestration pattern description when available', () => {
        const mockSelectedDeployment = {
            WorkflowParams: {
                OrchestrationPattern: 'agents-as-tools',
                AgentsAsToolsParams: {
                    Agents: []
                }
            }
        };

        cloudscapeRender(
            <WorkflowOrchestration
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        // Check that the description is displayed
        expect(
            screen.getByText('Specialized agents are wrapped as callable functions for a client agent')
        ).toBeInTheDocument();
    });
});
