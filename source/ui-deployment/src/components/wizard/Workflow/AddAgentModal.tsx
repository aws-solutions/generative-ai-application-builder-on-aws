// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
    Modal,
    Box,
    SpaceBetween,
    Button,
    Alert,
    Checkbox,
    Container,
    Input,
    FormField,
    StatusIndicator
} from '@cloudscape-design/components';
import { Agent } from '../interfaces/Steps/WorkflowStep';
import { useAgentsQuery } from '@/hooks/useQueries';
import { fetchAgent } from '@/services/fetchAgentData';
import { ACTIVE_DEPLOYMENT_STATUSES } from '@/utils/constants';

interface AddAgentModalProps {
    visible: boolean;
    onDismiss: () => void;
    onAddAgents: (agents: Agent[]) => void;
    excludeAgentIds: string[];
    maxSelectableAgents: number;
}

const AddAgentModal: React.FC<AddAgentModalProps> = ({
    visible,
    onDismiss,
    onAddAgents,
    excludeAgentIds,
    maxSelectableAgents
}) => {
    const [filteredAgents, setFilteredAgents] = React.useState<Agent[]>([]);
    const [selectedAgentIds, setSelectedAgentIds] = React.useState<string[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
    const [agentDetailsToFetch, setAgentDetailsToFetch] = React.useState<string[]>([]);

    // Fetch agents using the query hook
    const { data: agentsData, isLoading, error: queryError, refetch } = useAgentsQuery(1, { enabled: visible });

    // Convert API response to AvailableAgent format
    const availableAgents: Agent[] = React.useMemo(() => {
        if (!agentsData?.deployments) return [];

        return agentsData.deployments
            .filter((agent) => ACTIVE_DEPLOYMENT_STATUSES.includes(agent.status as any))
            .map((agent) => ({
                useCaseId: agent.UseCaseId,
                useCaseName: agent.Name,
                ...(agent.Description && { useCaseDescription: agent.Description }),
                useCaseType: agent.UseCaseType,
                //below are not provided in List summary data. Will be populated later when selected
                agentBuilderParams: undefined,
                llmParams: undefined
            }));
    }, [agentsData]);

    // Fetch agent details when agentDetailsToFetch changes
    React.useEffect(() => {
        if (agentDetailsToFetch.length > 0) {
            const fetchAgentDetails = async () => {
                try {
                    const selectedAgents = availableAgents.filter((agent) =>
                        agentDetailsToFetch.includes(agent.useCaseId)
                    );

                    // Fetch detailed information for each selected agent
                    const agentsWithDetails = await Promise.all(
                        selectedAgents.map(async (agent) => {
                            try {
                                const agentDetails = await fetchAgent(agent.useCaseId);

                                return {
                                    ...agent,
                                    agentBuilderParams: agentDetails.AgentBuilderParams,
                                    llmParams: agentDetails.LlmParams
                                };
                            } catch (error) {
                                console.error(`Error fetching details for agent ${agent.useCaseId}:`, error);
                                // Return agent without detailed params if fetch fails
                                return agent;
                            }
                        })
                    );

                    console.log('Selected Agents with Details:', agentsWithDetails);
                    onAddAgents(agentsWithDetails);
                } catch (error) {
                    console.error('Error loading agent details:', error);
                    // Fallback to adding agents without detailed params
                    const selectedAgents = availableAgents.filter((agent) =>
                        agentDetailsToFetch.includes(agent.useCaseId)
                    );
                    onAddAgents(selectedAgents);
                } finally {
                    // Reset state
                    setIsLoadingDetails(false);
                    setAgentDetailsToFetch([]);
                }
            };

            fetchAgentDetails();
        }
    }, [agentDetailsToFetch, availableAgents, onAddAgents]);

    React.useEffect(() => {
        if (visible) {
            setSelectedAgentIds([]);
            setSearchQuery('');
            setAgentDetailsToFetch([]);
            setIsLoadingDetails(false);
        }
    }, [visible]);

    React.useEffect(() => {
        // Filter agents based on search query and exclude already selected ones
        const filtered = availableAgents
            .filter((agent) => !excludeAgentIds.includes(agent.useCaseId))
            .filter(
                (agent) =>
                    agent.useCaseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    agent.useCaseDescription?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        setFilteredAgents(filtered);
    }, [availableAgents, excludeAgentIds, searchQuery]);

    const handleAgentSelection = (agentId: string, checked: boolean) => {
        if (checked) {
            if (selectedAgentIds.length < maxSelectableAgents) {
                setSelectedAgentIds((prev) => [...prev, agentId]);
            }
        } else {
            setSelectedAgentIds((prev) => prev.filter((id) => id !== agentId));
        }
    };

    const handleAddSelected = () => {
        const selectedAgents = availableAgents.filter((agent) => selectedAgentIds.includes(agent.useCaseId));

        // Set loading state and trigger fetching of agent details
        setIsLoadingDetails(true);
        setAgentDetailsToFetch(selectedAgents.map((agent) => agent.useCaseId));
    };

    const canSelectMore = selectedAgentIds.length < maxSelectableAgents;

    return (
        <Modal
            onDismiss={onDismiss}
            visible={visible}
            closeAriaLabel="Close modal"
            size="large"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" onClick={onDismiss}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleAddSelected}
                            disabled={selectedAgentIds.length === 0 || isLoadingDetails}
                            loading={isLoadingDetails}
                        >
                            {isLoadingDetails ? 'Loading Details...' : `Add Selected (${selectedAgentIds.length})`}
                        </Button>
                    </SpaceBetween>
                </Box>
            }
            header="Add Agents to Workflow"
        >
            <SpaceBetween size="l">
                <Box variant="p">
                    Select agents to add to your workflow. You can select up to {maxSelectableAgents} additional agents.
                </Box>

                <FormField label="Search agents">
                    <Input
                        onChange={({ detail }) => setSearchQuery(detail.value)}
                        value={searchQuery}
                        placeholder="Search by name or description..."
                        clearAriaLabel="Clear search"
                        type="search"
                    />
                </FormField>

                {!canSelectMore && (
                    <Alert statusIconAriaLabel="Warning" type="warning" header="Selection limit reached">
                        You have reached the maximum number of agents you can select ({maxSelectableAgents}).
                    </Alert>
                )}

                {queryError && (
                    <Alert
                        statusIconAriaLabel="Error"
                        type="error"
                        header="Error loading agents"
                        action={<Button onClick={() => refetch()}>Retry</Button>}
                    >
                        Failed to load available agents. Please try again.
                    </Alert>
                )}

                {isLoading ? (
                    <Box textAlign="center">
                        <StatusIndicator type="loading">Loading available agents...</StatusIndicator>
                    </Box>
                ) : (
                    <Container>
                        {filteredAgents.length === 0 ? (
                            <Box textAlign="center" color="inherit">
                                <b>No agents found</b>
                                <Box variant="p" color="inherit">
                                    {searchQuery
                                        ? 'Try adjusting your search terms.'
                                        : 'No agents are available to add.'}
                                </Box>
                            </Box>
                        ) : (
                            <SpaceBetween size="s">
                                {filteredAgents.map((agent) => (
                                    <Checkbox
                                        key={agent.useCaseId}
                                        onChange={({ detail }) => handleAgentSelection(agent.useCaseId, detail.checked)}
                                        checked={selectedAgentIds.includes(agent.useCaseId)}
                                        disabled={!canSelectMore && !selectedAgentIds.includes(agent.useCaseId)}
                                        description={agent.useCaseDescription || `No description is available.`}
                                    >
                                        {agent.useCaseName}
                                    </Checkbox>
                                ))}
                            </SpaceBetween>
                        )}
                    </Container>
                )}
            </SpaceBetween>
        </Modal>
    );
};

export default AddAgentModal;
