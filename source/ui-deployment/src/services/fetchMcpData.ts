// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from 'aws-amplify';
import { API_NAME, DEPLOYMENT_PLATFORM_API_ROUTES } from '../utils/constants';
import { generateToken } from '../utils';

export interface McpServer {
    useCaseId: string;
    useCaseName: string;
    description: string;
    status: 'ACTIVE' | 'INACTIVE';
    url: string;
    type: 'gateway' | 'runtime';
}

export interface StrandsTool {
    name: string;
    description: string;
    value: string;
    type: 'STRANDS_TOOL';
    category?: string;
    isDefault?: boolean;
}

export type AgentResource = McpServer | StrandsTool;

export interface McpServerListResponse {
    mcpServers: McpServer[];
}

export interface AgentResourcesResponse {
    mcpServers: McpServer[];
    strandsTools: StrandsTool[];
}

/**
 * Fetches the list of MCP servers available to the user
 * @returns Promise<McpServerListResponse> List of MCP servers
 */
export const fetchMcpServers = async (): Promise<McpServerListResponse> => {
    try {
        const token = await generateToken();
        const response = await API.get(API_NAME, DEPLOYMENT_PLATFORM_API_ROUTES.LIST_MCP_SERVERS.route, {
            headers: { Authorization: token },
            queryStringParameters: { pageNumber: '1' }
        });
        return response;
    } catch (error) {
        console.error('Error fetching MCP servers:', error);
        throw error;
    }
};

/**
 * Fetches all available agent resources (MCP servers and out-of-the-box tools)
 * @returns Promise<AgentResourcesResponse> Combined list of MCP servers and Strands tools from API
 */
export const fetchAgentResources = async (): Promise<AgentResourcesResponse> => {
    try {
        const token = await generateToken();
        const response = await API.get(API_NAME, DEPLOYMENT_PLATFORM_API_ROUTES.LIST_MCP_SERVERS.route, {
            headers: { Authorization: token },
            queryStringParameters: { pageNumber: '1' }
        });

        // Ensure strandsTools exists in response, default to empty array if missing
        const strandsTools = response.strandsTools || [];

        // Add type property to tools for UI compatibility
        const typedStrandsTools: StrandsTool[] = strandsTools.map((tool: any) => ({
            ...tool,
            type: 'STRANDS_TOOL' as const
        }));

        return {
            mcpServers: response.mcpServers || [],
            strandsTools: typedStrandsTools
        };
    } catch (error) {
        console.error('Error fetching agent resources:', error);
        throw error;
    }
};

/**
 * Fetches detailed information about a specific MCP server
 * @param mcpId The ID of the MCP server to fetch
 * @returns Promise<McpServer> Detailed MCP server information
 */
export const fetchMcpServerDetails = async (mcpId: string): Promise<McpServer> => {
    if (!mcpId) {
        throw new Error('Missing mcpId');
    }

    const allServers = await fetchMcpServers();
    const server = allServers.mcpServers.find((s) => s.useCaseId === mcpId);

    if (!server) {
        throw new Error(`MCP server with ID ${mcpId} not found`);
    }

    return server;
};

/**
 * Formats agent resources for use in UI components like MultiSelect with grouped options
 * @param agentResources Combined MCP servers and Strands tools
 * @returns Array of formatted options with groups for UI components
 */
export const formatAgentResourcesForUI = (agentResources: AgentResourcesResponse) => {
    const options: any[] = [];

    // Add MCP Servers group
    if (agentResources.mcpServers?.length > 0) {
        const activeServers = agentResources.mcpServers.filter((server) => server.status === 'ACTIVE');
        if (activeServers.length > 0) {
            options.push({
                label: 'MCP Servers',
                options: activeServers.map((server) => ({
                    label: `${server.type.toUpperCase()}: ${server.useCaseName}`,
                    value: server.useCaseId,
                    description: server.description || server.url,
                    iconName: 'share',
                    // Store full server data for later retrieval
                    useCaseId: server.useCaseId,
                    useCaseName: server.useCaseName,
                    serverDescription: server.description,
                    url: server.url,
                    type: server.type,
                    status: server.status
                }))
            });
        }
    }

    // Add Tools provided out of the box group
    if (agentResources.strandsTools.length > 0) {
        options.push({
            label: 'Tools provided out of the box',
            options: agentResources.strandsTools.map((tool) => ({
                label: tool.name,
                value: tool.value,
                description: tool.description,
                iconName: 'settings',
                type: tool.type
            }))
        });
    }

    return options;
};
