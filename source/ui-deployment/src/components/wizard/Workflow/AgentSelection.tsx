// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Button, SpaceBetween, Cards, Box, ButtonDropdown, Header, Link } from '@cloudscape-design/components';
import AddAgentModal from './AddAgentModal';
import { MAX_NUMBER_OF_AGENTS_IN_WORKFLOW } from '@/utils/constants';
import { BaseFormComponentProps } from '../interfaces';

interface AgentSelectionProps extends BaseFormComponentProps {
    selectedAgents: any[];
}

const AgentSelection: React.FC<AgentSelectionProps> = ({ selectedAgents, onChangeFn, setNumFieldsInError }) => {
    const [showAddAgentModal, setShowAddAgentModal] = React.useState(false);
    const [selectedAgentIds, setSelectedAgentIds] = React.useState<string[]>([]);

    React.useEffect(() => {
        // Validate agent count
        const agentCountError = selectedAgents.length === 0 || selectedAgents.length > MAX_NUMBER_OF_AGENTS_IN_WORKFLOW;
        setNumFieldsInError((prev: number) => (agentCountError ? Math.max(prev, 1) : Math.max(prev - 1, 0)));
    }, [selectedAgents.length, setNumFieldsInError]);

    const handleRemoveSelectedAgents = () => {
        const updatedAgents = selectedAgents.filter((agent) => !selectedAgentIds.includes(agent.useCaseId));
        onChangeFn({ selectedAgents: updatedAgents });
        setSelectedAgentIds([]);
    };

    const handleAddAgents = (newAgents: any[]) => {
        // Filter out duplicates
        const existingIds = selectedAgents.map((agent) => agent.useCaseId);
        const uniqueNewAgents = newAgents.filter((agent) => !existingIds.includes(agent.useCaseId));

        // Check if adding would exceed limit
        const totalAgents = selectedAgents.length + uniqueNewAgents.length;
        if (totalAgents > MAX_NUMBER_OF_AGENTS_IN_WORKFLOW) {
            // Only add up to the limit
            const remainingSlots = MAX_NUMBER_OF_AGENTS_IN_WORKFLOW - selectedAgents.length;
            const agentsToAdd = uniqueNewAgents.slice(0, remainingSlots);
            onChangeFn({ selectedAgents: [...selectedAgents, ...agentsToAdd] });
        } else {
            onChangeFn({ selectedAgents: [...selectedAgents, ...uniqueNewAgents] });
        }
        setShowAddAgentModal(false);
    };

    return (
        <>
            <Cards
                cardDefinition={{
                    header: (agent: any) => (
                        <Link
                            variant="primary"
                            fontSize="heading-m"
                            href={`/deployment-details/${agent.useCaseType}/${agent.useCaseId}`}
                            external
                            data-testid={`agent-name-link-${agent.useCaseId}`}
                        >
                            {agent.useCaseName}
                        </Link>
                    ),
                    sections: [
                        {
                            id: 'description',
                            content: (agent: any) => agent.useCaseDescription || 'No description available'
                        }
                    ]
                }}
                cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 2 }]}
                items={selectedAgents}
                loadingText="Loading agents"
                selectionType="multi"
                selectedItems={selectedAgents.filter((agent) => selectedAgentIds.includes(agent.useCaseId))}
                onSelectionChange={({ detail }) => {
                    setSelectedAgentIds(detail.selectedItems.map((item) => item.useCaseId));
                }}
                header={
                    <Header
                        counter={selectedAgents.length > 0 ? `(${selectedAgents.length})` : undefined}
                        description={
                            <>
                                Select specialized agents that the client agent can use as tools. You can select between
                                1 and {MAX_NUMBER_OF_AGENTS_IN_WORKFLOW} agents.
                                {selectedAgents.length >= MAX_NUMBER_OF_AGENTS_IN_WORKFLOW && (
                                    <Box variant="small" color="text-status-warning" margin={{ top: 'xs' }}>
                                        Maximum of {MAX_NUMBER_OF_AGENTS_IN_WORKFLOW} agents allowed
                                    </Box>
                                )}
                            </>
                        }
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <ButtonDropdown
                                    items={[
                                        {
                                            text: 'Remove',
                                            id: 'remove',
                                            disabled: selectedAgentIds.length === 0
                                        }
                                    ]}
                                    onItemClick={({ detail }) => {
                                        if (detail.id === 'remove') {
                                            handleRemoveSelectedAgents();
                                        }
                                    }}
                                    data-testid="agent-actions-dropdown"
                                >
                                    Actions
                                </ButtonDropdown>
                                <Button
                                    variant="primary"
                                    onClick={() => setShowAddAgentModal(true)}
                                    disabled={selectedAgents.length >= MAX_NUMBER_OF_AGENTS_IN_WORKFLOW}
                                    data-testid="add-agent-button"
                                >
                                    Add Agent
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        Agent Selection
                    </Header>
                }
                empty={
                    <Box textAlign="center" color="inherit">
                        <b>No agents selected</b>
                        <Box variant="p" color="inherit">
                            Click "Add Agent" to select agents for your workflow.
                        </Box>
                    </Box>
                }
                data-testid="selected-agents-cards"
            />

            <AddAgentModal
                visible={showAddAgentModal}
                onDismiss={() => setShowAddAgentModal(false)}
                onAddAgents={handleAddAgents}
                excludeAgentIds={selectedAgents.map((agent) => agent.useCaseId)}
                maxSelectableAgents={MAX_NUMBER_OF_AGENTS_IN_WORKFLOW - selectedAgents.length}
            />
        </>
    );
};

export default AgentSelection;
