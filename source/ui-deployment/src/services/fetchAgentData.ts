// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from 'aws-amplify';
import { API_NAME } from '../utils/constants';
import { generateToken } from '../utils';

export interface AgentSummary {
    UseCaseId: string;
    Name: string;
    Description?: string;
    CreatedDate: string;
    status: string;
    cloudFrontWebUrl?: string;
    ModelProvider?: string;
    UseCaseType: string;
}

export interface AgentListResponse {
    deployments: AgentSummary[];
    numUseCases: number;
    nextPage?: number;
}

/**
 * Fetches the list of deployed agents available to the user
 * @param pageNumber The page number to fetch (defaults to 1)
 * @returns Promise<AgentListResponse> List of agents
 */
export const fetchAgents = async (pageNumber: number = 1): Promise<AgentListResponse> => {
    try {
        const token = await generateToken();
        const response = await API.get(API_NAME, '/deployments/agents', {
            headers: { Authorization: token },
            queryStringParameters: { pageNumber: pageNumber.toString() }
        });
        return response;
    } catch (error) {
        console.error('Error fetching agents:', error);
        throw error;
    }
};

/**
 * Fetches a single agent by its use case ID
 * @param useCaseId The use case ID of the agent to fetch
 * @returns Promise<Agent> The agent details
 */
export const fetchAgent = async (useCaseId: string): Promise<any> => {
    try {
        const token = await generateToken();
        const response = await API.get(API_NAME, `/deployments/agents/${useCaseId}`, {
            headers: { Authorization: token }
        });
        return response;
    } catch (error) {
        console.error('Error fetching agent:', error);
        throw error;
    }
};
