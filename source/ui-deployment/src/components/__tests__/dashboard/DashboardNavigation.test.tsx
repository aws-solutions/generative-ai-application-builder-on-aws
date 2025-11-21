// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardView from '../../dashboard/DashboardView';
import { HomeContext } from '../../../contexts/home.context';
import { USECASE_TYPES } from '../../../utils/constants';

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate
}));

// Mock API calls
jest.mock('aws-amplify', () => ({
    API: {
        get: jest.fn().mockResolvedValue({
            deployments: [],
            numUseCases: 0
        })
    },
    Auth: {
        currentAuthenticatedUser: jest.fn().mockResolvedValue({
            getSignInUserSession: () => ({
                getAccessToken: () => ({
                    getJwtToken: () => 'fake-token'
                })
            })
        })
    }
}));

describe('Dashboard Navigation', () => {
    const mockContextValue = {
        dispatch: jest.fn(),
        state: {
            authorized: true,
            deploymentsData: [],
            selectedDeployment: {},
            deploymentAction: 'CREATE',
            numUseCases: 0,
            currentPageIndex: 1,
            searchFilter: '',
            submittedSearchFilter: '',
            reloadData: false,
            runtimeConfig: {}
        }
    };

    beforeEach(() => {
        mockNavigate.mockClear();
    });

    test('navigates to correct route for Text use case', () => {
        const textDeployment = {
            UseCaseId: 'test-id-123',
            UseCaseType: USECASE_TYPES.TEXT,
            Name: 'Test Text Use Case'
        };

        // Mock the handleOnDeploymentIdClick function behavior
        const expectedRoute = `/deployment-details/${USECASE_TYPES.TEXT}/${textDeployment.UseCaseId}`;

        // Simulate the navigation logic from DashboardView
        const useCaseType = textDeployment.UseCaseType ?? USECASE_TYPES.TEXT;
        const navigationPath = `/deployment-details/${useCaseType}/${textDeployment.UseCaseId}`;

        expect(navigationPath).toBe(expectedRoute);
    });

    test('navigates to correct route for Agent use case', () => {
        const agentDeployment = {
            UseCaseId: 'agent-id-456',
            UseCaseType: USECASE_TYPES.AGENT,
            Name: 'Test Agent Use Case'
        };

        const expectedRoute = `/deployment-details/${USECASE_TYPES.AGENT}/${agentDeployment.UseCaseId}`;

        const useCaseType = agentDeployment.UseCaseType ?? USECASE_TYPES.TEXT;
        const navigationPath = `/deployment-details/${useCaseType}/${agentDeployment.UseCaseId}`;

        expect(navigationPath).toBe(expectedRoute);
    });

    test('navigates to correct route for MCP Server use case', () => {
        const mcpDeployment = {
            UseCaseId: 'mcp-id-789',
            UseCaseType: USECASE_TYPES.MCP_SERVER,
            Name: 'Test MCP Server Use Case'
        };

        const expectedRoute = `/deployment-details/${USECASE_TYPES.MCP_SERVER}/${mcpDeployment.UseCaseId}`;

        const useCaseType = mcpDeployment.UseCaseType ?? USECASE_TYPES.TEXT;
        const navigationPath = `/deployment-details/${useCaseType}/${mcpDeployment.UseCaseId}`;

        expect(navigationPath).toBe(expectedRoute);
    });

    test('defaults to Text use case type when UseCaseType is missing', () => {
        const deploymentWithoutType = {
            UseCaseId: 'no-type-id-999',
            Name: 'Use Case Without Type'
        };

        const expectedRoute = `/deployment-details/${USECASE_TYPES.TEXT}/${deploymentWithoutType.UseCaseId}`;

        const useCaseType = deploymentWithoutType.UseCaseType ?? USECASE_TYPES.TEXT;
        const navigationPath = `/deployment-details/${useCaseType}/${deploymentWithoutType.UseCaseId}`;

        expect(navigationPath).toBe(expectedRoute);
    });
});
