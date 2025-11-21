// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddAgentModal from '../../../wizard/Workflow/AddAgentModal';
import * as QueryHooks from '@/hooks/useQueries';
import { AgentListResponse, fetchAgent } from '@/services/fetchAgentData';

// Mock the fetchAgent function
vi.mock('@/services/fetchAgentData', async () => {
    const actual = await vi.importActual('@/services/fetchAgentData');
    return {
        ...actual,
        fetchAgent: vi.fn()
    };
});

describe('AddAgentModal', () => {
    const mockOnDismiss = vi.fn();
    const mockOnAddAgents = vi.fn();
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });

    const mockAgentsData: AgentListResponse = {
        deployments: [
            {
                UseCaseId: 'agent-1',
                Name: 'Research Agent',
                Description: 'Specialized in conducting research',
                CreatedDate: '2024-01-15T10:00:00Z',
                status: 'CREATE_COMPLETE',
                UseCaseType: 'AgentBuilder'
            },
            {
                UseCaseId: 'agent-2',
                Name: 'Product Agent',
                Description: 'Expert in product recommendations',
                CreatedDate: '2024-01-16T10:00:00Z',
                status: 'CREATE_COMPLETE',
                UseCaseType: 'AgentBuilder'
            },
            {
                UseCaseId: 'agent-3',
                Name: 'Travel Agent',
                Description: 'Assists with travel planning',
                CreatedDate: '2024-01-17T10:00:00Z',
                status: 'CREATE_COMPLETE',
                UseCaseType: 'AgentBuilder'
            }
        ],
        numUseCases: 3
    };

    const defaultProps = {
        visible: true,
        onDismiss: mockOnDismiss,
        onAddAgents: mockOnAddAgents,
        excludeAgentIds: [],
        maxSelectableAgents: 5
    };

    const renderWithQueryClient = (component: React.ReactElement) => {
        return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
    };

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    describe('Loading State', () => {
        it('should show loading indicator when fetching agents', () => {
            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: undefined,
                isLoading: true,
                error: null,
                refetch: vi.fn()
            } as any);

            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            expect(screen.getByText('Loading available agents...')).toBeInTheDocument();
        });
    });

    describe('Success State', () => {
        beforeEach(() => {
            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: mockAgentsData,
                isLoading: false,
                error: null,
                refetch: vi.fn()
            } as any);
        });

        it('should render modal with agents list', () => {
            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            expect(screen.getByText('Add Agents to Workflow')).toBeInTheDocument();
            expect(screen.getByText('Research Agent')).toBeInTheDocument();
            expect(screen.getByText('Product Agent')).toBeInTheDocument();
            expect(screen.getByText('Travel Agent')).toBeInTheDocument();
        });

        it('should display agent descriptions', () => {
            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            expect(screen.getByText('Specialized in conducting research')).toBeInTheDocument();
            expect(screen.getByText('Expert in product recommendations')).toBeInTheDocument();
        });

        it('should allow selecting agents', () => {
            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            const checkbox = screen.getByRole('checkbox', { name: /Research Agent/i });
            fireEvent.click(checkbox);

            expect(checkbox).toBeChecked();
            expect(screen.getByText('Add Selected (1)')).toBeInTheDocument();
        });

        it('should allow selecting multiple agents', () => {
            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            const researchCheckbox = screen.getByRole('checkbox', { name: /Research Agent/i });
            const productCheckbox = screen.getByRole('checkbox', { name: /Product Agent/i });

            fireEvent.click(researchCheckbox);
            fireEvent.click(productCheckbox);

            expect(researchCheckbox).toBeChecked();
            expect(productCheckbox).toBeChecked();
            expect(screen.getByText('Add Selected (2)')).toBeInTheDocument();
        });

        it('should call onAddAgents with selected agents when Add button is clicked', async () => {
            // Mock fetchAgent to return agent details
            const mockFetchAgent = vi.mocked(fetchAgent);
            mockFetchAgent.mockResolvedValue({
                AgentBuilderParams: { mockAgentBuilderParam: 'value' },
                LlmParams: { mockLlmParam: 'value' }
            });

            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            const checkbox = screen.getByRole('checkbox', { name: /Research Agent/i });
            fireEvent.click(checkbox);

            const addButton = screen.getByRole('button', { name: /Add Selected \(1\)/i });
            fireEvent.click(addButton);

            // Wait for the async operation to complete
            await waitFor(() => {
                expect(mockOnAddAgents).toHaveBeenCalledWith([
                    {
                        useCaseId: 'agent-1',
                        useCaseName: 'Research Agent',
                        useCaseDescription: 'Specialized in conducting research',
                        useCaseType: 'AgentBuilder',
                        agentBuilderParams: { mockAgentBuilderParam: 'value' },
                        llmParams: { mockLlmParam: 'value' }
                    }
                ]);
            });
        });

        it('should disable Add button when no agents are selected', () => {
            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /Add Selected \(0\)/i });
            expect(addButton).toBeDisabled();
        });

        it('should call onDismiss when Cancel button is clicked', () => {
            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            const cancelButton = screen.getByRole('button', { name: /Cancel/i });
            fireEvent.click(cancelButton);

            expect(mockOnDismiss).toHaveBeenCalled();
        });
    });

    describe('Search Functionality', () => {
        beforeEach(() => {
            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: mockAgentsData,
                isLoading: false,
                error: null,
                refetch: vi.fn()
            } as any);
        });

        it('should filter agents by name', () => {
            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            const searchInput = screen.getByPlaceholderText('Search by name or description...');
            fireEvent.change(searchInput, { target: { value: 'Research' } });

            expect(screen.getByText('Research Agent')).toBeInTheDocument();
            expect(screen.queryByText('Product Agent')).not.toBeInTheDocument();
            expect(screen.queryByText('Travel Agent')).not.toBeInTheDocument();
        });

        it('should filter agents by description', () => {
            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            const searchInput = screen.getByPlaceholderText('Search by name or description...');
            fireEvent.change(searchInput, { target: { value: 'product recommendations' } });

            expect(screen.getByText('Product Agent')).toBeInTheDocument();
            expect(screen.queryByText('Research Agent')).not.toBeInTheDocument();
        });

        it('should show "No agents found" message when search has no results', () => {
            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            const searchInput = screen.getByPlaceholderText('Search by name or description...');
            fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

            expect(screen.getByText('No agents found')).toBeInTheDocument();
            expect(screen.getByText('Try adjusting your search terms.')).toBeInTheDocument();
        });
    });

    describe('Exclude Agents', () => {
        beforeEach(() => {
            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: mockAgentsData,
                isLoading: false,
                error: null,
                refetch: vi.fn()
            } as any);
        });

        it('should not display excluded agents', () => {
            const propsWithExclusions = {
                ...defaultProps,
                excludeAgentIds: ['agent-1', 'agent-2']
            };

            renderWithQueryClient(<AddAgentModal {...propsWithExclusions} />);

            expect(screen.queryByText('Research Agent')).not.toBeInTheDocument();
            expect(screen.queryByText('Product Agent')).not.toBeInTheDocument();
            expect(screen.getByText('Travel Agent')).toBeInTheDocument();
        });
    });

    describe('Selection Limits', () => {
        beforeEach(() => {
            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: mockAgentsData,
                isLoading: false,
                error: null,
                refetch: vi.fn()
            } as any);
        });

        it('should show warning when selection limit is reached', () => {
            const propsWithLimit = {
                ...defaultProps,
                maxSelectableAgents: 2
            };

            renderWithQueryClient(<AddAgentModal {...propsWithLimit} />);

            const researchCheckbox = screen.getByRole('checkbox', { name: /Research Agent/i });
            const productCheckbox = screen.getByRole('checkbox', { name: /Product Agent/i });

            fireEvent.click(researchCheckbox);
            fireEvent.click(productCheckbox);

            expect(screen.getByText(/You have reached the maximum number of agents/i)).toBeInTheDocument();
        });

        it('should disable unselected checkboxes when limit is reached', () => {
            const propsWithLimit = {
                ...defaultProps,
                maxSelectableAgents: 1
            };

            renderWithQueryClient(<AddAgentModal {...propsWithLimit} />);

            const researchCheckbox = screen.getByRole('checkbox', { name: /Research Agent/i });
            const productCheckbox = screen.getByRole('checkbox', { name: /Product Agent/i });

            fireEvent.click(researchCheckbox);

            expect(researchCheckbox).not.toBeDisabled();
            expect(productCheckbox).toBeDisabled();
        });
    });

    describe('Error State', () => {
        it('should show error message when fetch fails', () => {
            const mockRefetch = vi.fn();
            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: undefined,
                isLoading: false,
                error: new Error('Network error'),
                refetch: mockRefetch
            } as any);

            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            expect(screen.getByText('Error loading agents')).toBeInTheDocument();
            expect(screen.getByText('Failed to load available agents. Please try again.')).toBeInTheDocument();
        });

        it('should call refetch when Retry button is clicked', () => {
            const mockRefetch = vi.fn();
            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: undefined,
                isLoading: false,
                error: new Error('Network error'),
                refetch: mockRefetch
            } as any);

            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            const retryButton = screen.getByRole('button', { name: /Retry/i });
            fireEvent.click(retryButton);

            expect(mockRefetch).toHaveBeenCalled();
        });
    });

    describe('Empty State', () => {
        it('should show "No agents found" when no agents are available', () => {
            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: { deployments: [], numUseCases: 0 },
                isLoading: false,
                error: null,
                refetch: vi.fn()
            } as any);

            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            expect(screen.getByText('No agents found')).toBeInTheDocument();
            expect(screen.getByText('No agents are available to add.')).toBeInTheDocument();
        });
    });

    describe('Modal Visibility', () => {
        beforeEach(() => {
            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: mockAgentsData,
                isLoading: false,
                error: null,
                refetch: vi.fn()
            } as any);
        });

        it('should reset selection when modal becomes visible', () => {
            const { rerender } = renderWithQueryClient(<AddAgentModal {...defaultProps} visible={false} />);

            rerender(
                <QueryClientProvider client={queryClient}>
                    <AddAgentModal {...defaultProps} visible={true} />
                </QueryClientProvider>
            );

            const addButton = screen.getByRole('button', { name: /Add Selected \(0\)/i });
            expect(addButton).toBeDisabled();
        });
    });

    describe('Agent without description', () => {
        it('should show fallback description for agents without description', () => {
            const agentsWithoutDescription: AgentListResponse = {
                deployments: [
                    {
                        UseCaseId: 'agent-no-desc',
                        Name: 'No Description Agent',
                        CreatedDate: '2024-01-15T10:00:00Z',
                        status: 'CREATE_COMPLETE',
                        UseCaseType: 'AgentBuilder'
                    }
                ],
                numUseCases: 1
            };

            vi.spyOn(QueryHooks, 'useAgentsQuery').mockReturnValue({
                data: agentsWithoutDescription,
                isLoading: false,
                error: null,
                refetch: vi.fn()
            } as any);

            renderWithQueryClient(<AddAgentModal {...defaultProps} />);

            expect(screen.getByText(/No description is available./i)).toBeInTheDocument();
        });
    });
});
