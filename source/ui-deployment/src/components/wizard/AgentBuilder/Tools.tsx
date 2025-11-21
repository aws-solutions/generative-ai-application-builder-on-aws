// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useContext } from 'react';
import {
    Box,
    Container,
    FormField,
    Header,
    SpaceBetween,
    Multiselect,
    StatusIndicator,
    MultiselectProps
} from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../interfaces';
import { InfoLink } from '@/components/commons';
import { IG_DOCS, DEPLOYMENT_ACTIONS } from '@/utils/constants';
import { useAgentResourcesQuery } from '@/hooks/useQueries';
import HomeContext from '@/contexts/home.context';

export interface ToolsProps extends BaseFormComponentProps {
    mcpServers: any[];
    tools: any[];
    setNumFieldsInError: React.Dispatch<React.SetStateAction<number>>;
    setToolsInError: React.Dispatch<React.SetStateAction<boolean>>;
    'data-testid'?: string;
}

export const Tools = (props: ToolsProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    // Fetch agent resources (MCP servers and out-of-the-box tools) from API
    const { data: agentResources, isPending, isError, error } = useAgentResourcesQuery();
    const [hasPreselectedDefaults, setHasPreselectedDefaults] = React.useState(false);

    // Extract formatted and raw data from the query response
    const formattedResources = agentResources?.formatted;
    const rawAgentResources = agentResources?.raw;

    // Tools are optional, so no validation errors
    React.useEffect(() => {
        props.setToolsInError(false);
    }, [props.setToolsInError]);

    // Pre-select default tools on component mount OR update incomplete tool data
    React.useEffect(() => {
        if (!rawAgentResources) return;

        // Check if we have tools with incomplete data (only value, missing name/description)
        const hasIncompleteTools =
            props.tools && props.tools.some((tool) => tool.value && (!tool.name || !tool.description));

        if (hasIncompleteTools) {
            // Update incomplete tools with full data from API
            const updatedTools = props.tools.map((tool) => {
                if (tool.value && (!tool.name || !tool.description)) {
                    const fullToolData = rawAgentResources.strandsTools.find((apiTool) => apiTool.value === tool.value);
                    if (fullToolData) {
                        return {
                            name: fullToolData.name,
                            description: fullToolData.description,
                            value: fullToolData.value,
                            type: tool.type
                        };
                    }
                }
                return tool;
            });

            props.onChangeFn({
                mcpServers: props.mcpServers,
                tools: updatedTools
            });
            return;
        }

        // Skip pre-selection when editing a use case to avoid confusing users
        if (deploymentAction === DEPLOYMENT_ACTIONS.EDIT) {
            return;
        }

        // Only run default selection once when agentResources are loaded and we haven't pre-selected yet
        // Skip if tools are already selected (user has made changes)
        if (hasPreselectedDefaults || (props.tools && props.tools.length > 0)) {
            return;
        }

        // Find default tools from the raw API response and store full objects
        const defaultTools = rawAgentResources.strandsTools
            .filter((tool) => tool.isDefault === true)
            .map((tool) => ({
                name: tool.name,
                description: tool.description,
                value: tool.value,
                type: 'STRANDS_TOOL'
            }));

        // If there are default tools, pre-select them
        if (defaultTools.length > 0) {
            props.onChangeFn({
                mcpServers: props.mcpServers,
                tools: defaultTools
            });
        }

        setHasPreselectedDefaults(true);
    }, [rawAgentResources, hasPreselectedDefaults, props.tools, props.onChangeFn, props.mcpServers]);

    /**
     * Finds and returns the MCP server data object from agent resources based on the selected option value
     * @param formattedResources - The formatted agent resources from the API
     * @param selectedValue - The value of the selected option
     * @returns The MCP server data object or null if not found
     */
    const findMcpServerData = (formattedResources: any[], selectedValue: string) => {
        const mcpServerOption = formattedResources
            .find((group: any) => group.label === 'MCP Servers')
            ?.options?.find((option: any) => option.value === selectedValue);

        if (mcpServerOption) {
            return {
                useCaseId: mcpServerOption.useCaseId,
                useCaseName: mcpServerOption.useCaseName,
                description: mcpServerOption.serverDescription,
                url: mcpServerOption.url,
                type: mcpServerOption.type,
                status: mcpServerOption.status
            };
        }
        return null;
    };

    /**
     * Finds and returns the Strands tool data object from agent resources based on the selected option value
     * @param formattedResources - The formatted agent resources from the API
     * @param selectedValue - The value of the selected option
     * @returns The Strands tool data object or null if not found
     */
    const findStrandsToolData = (formattedResources: any[], selectedValue: string) => {
        const toolOption = formattedResources
            .find((group: any) => group.label === 'Tools provided out of the box')
            ?.options?.find((option: any) => option.value === selectedValue);

        if (toolOption) {
            return {
                name: toolOption.label,
                description: toolOption.description,
                value: toolOption.value,
                type: 'STRANDS_TOOL'
            };
        }
        return null;
    };

    // Convert selected resources to MultiSelect option format
    const selectedOptions = React.useMemo(() => {
        if (!formattedResources) return [];

        const selectedMcpOptions = (props.mcpServers || []).map((server) => ({
            label: `${server.type.toUpperCase()}: ${server.useCaseName}`,
            value: server.useCaseId,
            description: server.description || server.url
        }));

        const selectedToolOptions = (props.tools || [])
            .map((tool) => {
                // If tool has incomplete data (only value), try to find the full details from formattedResources
                if (!tool.name || !tool.description) {
                    const fullToolData = findStrandsToolData(formattedResources, tool.value);
                    if (fullToolData) {
                        return {
                            label: fullToolData.name,
                            value: fullToolData.value,
                            description: fullToolData.description
                        };
                    }
                }

                return {
                    label: tool.name,
                    value: tool.value,
                    description: tool.description
                };
            })
            .filter((tool) => tool.value); // Filter out any tools that couldn't be matched

        return [...selectedMcpOptions, ...selectedToolOptions];
    }, [props.mcpServers, props.tools, formattedResources]);

    /**
     * Processes the selected options from the multiselect component and separates them into
     * MCP servers and Strands tools arrays
     * @param selectedOptions - Array of selected options from the multiselect component
     * @param formattedResources - The formatted agent resources from the API
     * @returns Object containing arrays of selected MCP servers and tool objects
     */
    const processSelectedOptions = (selectedOptions: readonly any[], formattedResources: any[]) => {
        const selectedMcpServers: any[] = [];
        const selectedTools: any[] = [];

        selectedOptions.forEach((selectedOption) => {
            // Try to find as MCP server first
            const mcpServerData = findMcpServerData(formattedResources, selectedOption.value);
            if (mcpServerData) {
                selectedMcpServers.push(mcpServerData);
                return;
            }

            // If not found as MCP server, it's a tool - store the full tool object
            const strandsToolData = findStrandsToolData(formattedResources, selectedOption.value);
            if (strandsToolData) {
                selectedTools.push(strandsToolData);
            }
        });

        return {
            mcpServers: selectedMcpServers,
            tools: selectedTools
        };
    };

    /**
     * Handles changes to the multiselect component by processing selected options
     * and updating the parent component with separated MCP servers and tools arrays
     * @param detail - The change detail from the multiselect component
     */
    const handleToolsChange = (detail: MultiselectProps.MultiselectChangeDetail) => {
        if (!formattedResources) return;

        const { mcpServers, tools } = processSelectedOptions(detail.selectedOptions, formattedResources);

        props.onChangeFn({
            mcpServers,
            tools
        });
    };

    return (
        <Container
            fitHeight={undefined}
            header={
                <Header variant="h2" data-testid="tools-header">
                    MCP Server and Tools
                </Header>
            }
            data-testid={props['data-testid']}
        >
            <SpaceBetween size="l">
                <FormField
                    description="Select MCP servers and tools provided out of the box to add to your agent"
                    label={
                        <>
                            Available MCP servers and tools
                            <i> - optional</i>
                        </>
                    }
                    info={
                        <InfoLink
                            onFollow={() => props.setHelpPanelContent!(toolsInfoPanel)}
                            data-testid="tools-info-link"
                        />
                    }
                    data-testid="tools-form-field"
                >
                    {isPending ? (
                        <StatusIndicator type="loading">Loading available MCP servers and tools...</StatusIndicator>
                    ) : isError ? (
                        <StatusIndicator type="error">
                            Error loading MCP servers and tools: {error?.message || 'Unknown error'}
                        </StatusIndicator>
                    ) : (
                        <Multiselect
                            selectedOptions={selectedOptions}
                            onChange={({ detail }) => handleToolsChange(detail)}
                            options={formattedResources || []}
                            filteringType="auto"
                            placeholder="Choose MCP servers and tools for your agent..."
                            empty="No MCP servers and tools available"
                            data-testid="tools-multiselect"
                        />
                    )}
                </FormField>
            </SpaceBetween>
        </Container>
    );
};

export default Tools;

const toolsInfoPanel = {
    title: 'MCP Server and Tools',
    content: (
        <div>
            <Box>
                Extend your AI agent's capabilities by adding MCP servers and tools provided out of the box. MCP servers
                provide access to external services and data sources, while out-of-the-box tools offer common
                functionality through the Strands SDK.
            </Box>
            <Box variant="h4">Types:</Box>
            <ul>
                <li>
                    <b>MCP Servers:</b> External services that provide domain-specific capabilities (e.g., healthcare
                    systems, databases)
                </li>
                <li>
                    <b>Tools provided out of the box:</b> Ready-to-use tools from the Strands SDK (e.g., HTTP requests,
                    file operations)
                </li>
            </ul>
            <Box variant="h4">Out-of-the-box Tool Categories:</Box>
            <ul>
                <li>
                    <b>Network:</b> HTTP requests and web service interactions
                </li>
                <li>
                    <b>System:</b> File operations and system interactions
                </li>
                <li>
                    <b>Data:</b> JSON parsing and data manipulation
                </li>
                <li>
                    <b>Text:</b> Text processing and manipulation
                </li>
                <li>
                    <b>Utilities:</b> Date/time and mathematical operations
                </li>
            </ul>
            <Box variant="h4">Configuring Tool Environment Variables:</Box>
            <Box>
                Some tools may require environment variables to function properly (e.g., API keys, authentication
                tokens, configuration settings). To configure these:
            </Box>
            <ol>
                <li>
                    Navigate to the <b>Model</b> step in the wizard
                </li>
                <li>
                    Open the <b>Advanced Model Settings</b> section
                </li>
                <li>
                    Add ModelParams entries using the pattern: <code>ENV_&lt;TOOL_NAME&gt;_&lt;ENV_VAR_NAME&gt;</code>
                </li>
                <li>
                    For each entry, provide a JSON object with <code>Value</code> (string) and <code>Type</code> (e.g.,
                    "string") fields
                </li>
            </ol>
            <Box variant="h4">ModelParams Structure:</Box>
            <Box>
                Each ModelParams entry should be structured as:
                <ul>
                    <li>
                        <b>Key:</b> <code>ENV_&lt;TOOL_NAME&gt;_&lt;ENV_VAR_NAME&gt;</code> pattern
                    </li>
                    <li>
                        <b>Value:</b> JSON object with <code>Value</code> (the actual value as a string) and{' '}
                        <code>Type</code> (data type, e.g., "string")
                    </li>
                </ul>
            </Box>
            <Box variant="h4">Example - Setting Timezone for current_time Tool:</Box>
            <Box>
                To set the default timezone for the current_time tool:
                <ul>
                    <li>
                        <b>Key:</b> <code>ENV_CURRENT_TIME_DEFAULT_TIMEZONE</code>
                    </li>
                    <li>
                        <b>Value:</b> <code>{`{"Value": "America/New_York", "Type": "string"}`}</code>
                    </li>
                </ul>
                This will set the <code>DEFAULT_TIMEZONE</code> environment variable to <code>America/New_York</code>{' '}
                for the current_time tool.
            </Box>
            <Box variant="h4">Additional Examples:</Box>
            <Box>
                For calculator tool precision:
                <ul>
                    <li>
                        <b>Key:</b> <code>ENV_CALCULATOR_PRECISION</code>
                    </li>
                    <li>
                        <b>Value:</b> <code>{`{"Value": "5", "Type": "string"}`}</code>
                    </li>
                </ul>
            </Box>
            <Box>
                For environment tool configuration:
                <ul>
                    <li>
                        <b>Key:</b> <code>ENV_ENVIRONMENT_ALLOWED_VARS</code>
                    </li>
                    <li>
                        <b>Value:</b> <code>{`{"Value": "PATH,HOME,USER", "Type": "string"}`}</code>
                    </li>
                </ul>
            </Box>
            <Box variant="h4">Best Practices:</Box>
            <ul>
                <li>Select only the MCP servers and tools your agent actually needs</li>
                <li>Consider security implications when adding external MCP servers</li>
                <li>Test MCP server and tool combinations thoroughly</li>
                <li>Monitor MCP server and tool usage and performance</li>
            </ul>
            <Box variant="h4">Integration:</Box>
            <ul>
                <li>MCP servers follow the Model Context Protocol standard</li>
                <li>Out-of-the-box tools are provided through the Strands SDK</li>
                <li>MCP servers and tools can be combined for complex workflows</li>
                <li>Error handling and retry logic are built-in</li>
            </ul>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.AGENT_USE_CASE,
            text: 'Agent use case documentation'
        }
    ]
};
