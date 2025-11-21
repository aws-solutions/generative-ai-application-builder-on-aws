// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { WorkflowDetails } from '@/components/useCaseDetails/workflowDetails/WorkflowDetails';
import { cloudscapeRender } from '@/utils';

describe('WorkflowDetails', () => {
    const mockLoadHelpPanelContent = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders workflow details with complete configuration', () => {
        const mockSelectedDeployment = {
            WorkflowParams: {
                SystemPrompt: 'You are a customer support coordinator.',
                OrchestrationPattern: 'agents-as-tools',
                MemoryConfig: {
                    LongTermEnabled: true
                },
                AgentsAsToolsParams: {
                    Agents: [
                        { UseCaseId: 'agent-1', UseCaseName: 'Support Agent' },
                        { UseCaseId: 'agent-2', UseCaseName: 'Sales Agent' }
                    ]
                }
            }
        };

        cloudscapeRender(
            <WorkflowDetails
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        // Check containers are rendered
        expect(screen.getByTestId('workflow-client-agent-container')).toBeInTheDocument();
        expect(screen.getByTestId('workflow-multiagent-container')).toBeInTheDocument();

        // Check system prompt is displayed
        expect(screen.getByText('You are a customer support coordinator.')).toBeInTheDocument();

        // Check memory is enabled
        expect(screen.getByText('Yes')).toBeInTheDocument();

        // Check orchestration pattern
        expect(screen.getByText('Agents as Tools')).toBeInTheDocument();

        // Check agent count
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders with minimal configuration', () => {
        const mockSelectedDeployment = {
            WorkflowParams: {
                SystemPrompt: 'You are a helpful assistant.',
                OrchestrationPattern: 'agents-as-tools',
                MemoryConfig: {
                    LongTermEnabled: false
                },
                AgentsAsToolsParams: {
                    Agents: []
                }
            }
        };

        cloudscapeRender(
            <WorkflowDetails
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        expect(screen.getByText('You are a helpful assistant.')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles missing WorkflowParams', () => {
        const mockSelectedDeployment = {};

        cloudscapeRender(
            <WorkflowDetails
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        expect(screen.getByText('No system prompt configured')).toBeInTheDocument();
        expect(screen.getByText('Not configured')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles missing MemoryConfig', () => {
        const mockSelectedDeployment = {
            WorkflowParams: {
                SystemPrompt: 'Test prompt',
                OrchestrationPattern: 'agents-as-tools'
            }
        };

        cloudscapeRender(
            <WorkflowDetails
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeployment}
            />
        );

        expect(screen.getByText('No')).toBeInTheDocument();
    });
});
