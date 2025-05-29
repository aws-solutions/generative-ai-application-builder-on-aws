// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';

const setupStoreSpy = vi.fn(() => ({
    dispatch: vi.fn()
}));

const setRuntimeConfigSpy = vi.fn();

// Mock dependencies
vi.mock('react-dom/client', () => {
    const createRootMock = vi.fn(() => ({ render: vi.fn() }));
    return {
        default: {
            createRoot: createRootMock
        },
        createRoot: createRootMock
    };
});

vi.mock('aws-amplify', () => ({
    Amplify: { configure: vi.fn() }
}));

vi.mock('@store/store', () => ({
    setupStore: setupStoreSpy
}));

vi.mock('@store/configSlice', () => ({
    setRuntimeConfig: setRuntimeConfigSpy
}));

describe('main.tsx', () => {
    const mockRuntimeConfig = {
        UserPoolId: 'test-pool-id',
        UserPoolClientId: 'test-client-id',
        CognitoDomain: 'test-domain',
        CognitoRedirectUrl: 'http://localhost',
        ApiEndpoint: 'http://localhost/api'
    };

    beforeEach(() => {
        // Reset module cache between tests
        vi.resetModules();

        // Mock DOM element
        document.getElementById = vi.fn().mockReturnValue({});
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('fetches runtime config and initializes the application', async () => {
        // Mock fetch API for this test
        global.fetch = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue(mockRuntimeConfig)
        });

        // Import the module to trigger the initialization
        await import('../main');

        // Wait for promises to resolve
        await vi.waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/runtimeConfig.json');
            expect(Amplify.configure).toHaveBeenCalled();
            expect(setupStoreSpy).toHaveBeenCalled();
            expect(setRuntimeConfigSpy).toHaveBeenCalledWith(mockRuntimeConfig);
            expect(ReactDOM.createRoot).toHaveBeenCalled();
        });
    });

    it('handles fetch errors gracefully', async () => {
        // Mock console.log
        const consoleLogSpy = vi.spyOn(console, 'log');

        // Mock a failed fetch for this test
        global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

        // Import the module to trigger the initialization
        await import('../main');

        // Wait for promises to resolve
        await vi.waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/runtimeConfig.json');
            expect(consoleLogSpy).toHaveBeenCalled();
            // App should still initialize with empty config
            expect(Amplify.configure).toHaveBeenCalled();
            expect(setupStoreSpy).toHaveBeenCalled();
        });
    });
});
