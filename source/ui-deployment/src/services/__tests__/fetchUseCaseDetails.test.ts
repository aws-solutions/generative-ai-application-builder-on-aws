// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUseCaseDetails } from '../fetchUseCaseDetails';
import { API, Auth } from 'aws-amplify';

import { mockedAuthenticator } from '../../utils/test-utils';
import { API_NAME, DEPLOYMENT_PLATFORM_API_ROUTES } from '@/utils/constants';

describe('When fetching use case details using API', () => {
    const mockAPI = {
        get: vi.fn()
    };

    const mockUseCaseId = 'test-use-case-id';
    const mockUseCaseResponse = {
        id: mockUseCaseId,
        name: 'Test Use Case',
        description: 'This is a test use case',
        status: 'ACTIVE'
    };

    beforeEach(() => {
        mockAPI.get.mockResolvedValue(mockUseCaseResponse);

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should return the correct data', async () => {
        const data = await fetchUseCaseDetails({ useCaseId: mockUseCaseId });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(
            API_NAME,
            DEPLOYMENT_PLATFORM_API_ROUTES.GET_USE_CASE.route(mockUseCaseId),
            {
                headers: {
                    Authorization: 'fake-token'
                }
            }
        );

        expect(data).toEqual(mockUseCaseResponse);
    });

    test('should throw an error if useCaseId is undefined', async () => {
        await expect(fetchUseCaseDetails({ useCaseId: undefined })).rejects.toThrow('Missing useCaseId');
    });

    test('should throw an error if useCaseId is empty', async () => {
        await expect(fetchUseCaseDetails({ useCaseId: '' })).rejects.toThrow('Missing useCaseId');
    });

    test('should propagate API errors', async () => {
        const mockError = new Error('API error');
        mockAPI.get.mockRejectedValue(mockError);

        await expect(fetchUseCaseDetails({ useCaseId: mockUseCaseId })).rejects.toThrow(mockError);
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
    });

    test('should log errors to console', async () => {
        const mockError = new Error('API error');
        mockAPI.get.mockRejectedValue(mockError);

        const consoleSpy = vi.spyOn(console, 'error');

        try {
            await fetchUseCaseDetails({ useCaseId: mockUseCaseId });
        } catch (error) {
            // Expected to throw
        }

        expect(consoleSpy).toHaveBeenCalledWith(
            `Error fetching use case details for ID ${mockUseCaseId} (type=undefined):`,
            mockError
        );

        consoleSpy.mockRestore();
    });

    test('should route AgentBuilder details to /deployments/agents/{useCaseId}', async () => {
        await fetchUseCaseDetails({ useCaseId: mockUseCaseId, useCaseType: 'AgentBuilder' });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, `/deployments/agents/${mockUseCaseId}`, expect.any(Object));
    });
});
