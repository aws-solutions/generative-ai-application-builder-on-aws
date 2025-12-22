// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import {
    useModelNameQuery,
    useModelInfoQuery,
    useModelStreamingQuery,
    useModelTemperatureQuery,
    useModelProvidersQuery,
    useUseCaseDetailsQuery,
    useMcpServersQuery,
    useMcpServerDetailsQuery,
    useAgentResourcesQuery,
    getEffectiveModelId
} from '../useQueries';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { API, Auth } from 'aws-amplify';
import { API_NAME, BEDROCK_INFERENCE_TYPES, DEPLOYMENT_PLATFORM_API_ROUTES } from '@/utils/constants';
import { mockedAuthenticator } from '@/utils';
import { MODEL_PROVIDER_NAME_MAP } from '@/components/wizard/steps-config';

describe('getEffectiveModelId function', () => {
    test('returns inference-profile for Bedrock with OTHER_FOUNDATION_MODELS', () => {
        const result = getEffectiveModelId(
            MODEL_PROVIDER_NAME_MAP.Bedrock,
            'model-1',
            BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS
        );
        expect(result).toBe('inference-profile');
    });

    test('returns inference-profile for Bedrock with INFERENCE_PROFILES', () => {
        const result = getEffectiveModelId(
            MODEL_PROVIDER_NAME_MAP.Bedrock,
            'model-1',
            BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES
        );
        expect(result).toBe('inference-profile');
    });

    test('returns inference-profile for Bedrock with PROVISIONED_MODELS', () => {
        const result = getEffectiveModelId(
            MODEL_PROVIDER_NAME_MAP.Bedrock,
            'model-1',
            BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS
        );
        expect(result).toBe('inference-profile');
    });

    test('returns original modelId for non-Bedrock provider', () => {
        const result = getEffectiveModelId('SageMaker', 'model-1', BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
        expect(result).toBe('model-1');
    });

    test('returns original modelId when bedrockInferenceType is undefined', () => {
        const result = getEffectiveModelId(MODEL_PROVIDER_NAME_MAP.Bedrock, 'model-1', undefined);
        expect(result).toBe('model-1');
    });
});

describe('When using hook to fetch model names', () => {
    const mockAPI = {
        get: jest.fn()
    };

    let wrapper: any;

    beforeEach(() => {
        const queryClient = new QueryClient();
        mockAPI.get.mockResolvedValue(['model-1', 'model-2']);
        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('it should return model names', async () => {
        const { result } = renderHook(() => useModelNameQuery('Bedrock'), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock', {
            headers: {
                Authorization: 'fake-token'
            }
        });
        expect(result.current.data).toEqual(['model-1', 'model-2']);
    });
});

describe('When using hook to fetch model info', () => {
    const mockAPI = {
        get: jest.fn()
    };

    let wrapper: any;

    beforeEach(() => {
        const queryClient = new QueryClient();
        mockAPI.get.mockResolvedValue({
            modelId: 'XXXXXXX',
            providerName: 'provider-1',
            useCaseType: 'useCase-1'
        });
        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('it should return model info with default bedrockInferenceType', async () => {
        const { result } = renderHook(
            () => useModelInfoQuery('Bedrock', 'model-1', BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
        expect(result.current.data).toEqual({
            modelId: 'XXXXXXX',
            providerName: 'provider-1',
            useCaseType: 'useCase-1'
        });
    });

    test('it should use inference-profile for OTHER_FOUNDATION_MODELS', async () => {
        const { result } = renderHook(
            () => useModelInfoQuery('Bedrock', 'model-1', BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for Bedrock with INFERENCE_PROFILES even when modelId is not provided', async () => {
        const { result } = renderHook(
            () => useModelInfoQuery('Bedrock', '', BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES),
            { wrapper }
        );

        // Verify that the API was called with inference-profile
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for Bedrock with PROVISIONED_MODELS even when modelId is not provided', async () => {
        const { result } = renderHook(
            () => useModelInfoQuery('Bedrock', '', BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS),
            { wrapper }
        );

        // Verify that the API was called with inference-profile
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for Bedrock with OTHER_FOUNDATION_MODELS even when modelId is not provided', async () => {
        const { result } = renderHook(
            () => useModelInfoQuery('Bedrock', '', BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS),
            { wrapper }
        );

        // Verify that the API was called with inference-profile
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for SageMaker even when modelId is not provided', async () => {
        // Mock the MODEL_PROVIDER_NAME_MAP.SageMaker value to ensure it matches exactly
        const sageMakerProvider = 'SageMaker';

        const { result } = renderHook(() => useModelInfoQuery(sageMakerProvider, '', ''), { wrapper });

        // Verify that the API was called
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
    });
});

describe('When using hook to fetch model streaming', () => {
    const mockAPI = {
        get: jest.fn()
    };

    let wrapper: any;

    beforeEach(() => {
        const queryClient = new QueryClient();
        mockAPI.get.mockResolvedValue({
            'AllowsStreaming': true
        });
        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('it should return model streaming info with default bedrockInferenceType', async () => {
        const { result } = renderHook(
            () => useModelStreamingQuery('Bedrock', 'model-1', BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should use inference-profile for INFERENCE_PROFILES', async () => {
        const { result } = renderHook(
            () => useModelStreamingQuery('Bedrock', 'model-1', BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for Bedrock with INFERENCE_PROFILES even when modelId is not provided', async () => {
        const { result } = renderHook(
            () => useModelStreamingQuery('Bedrock', '', BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES),
            { wrapper }
        );

        // Verify that the API was called with inference-profile
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for Bedrock with PROVISIONED_MODELS even when modelId is not provided', async () => {
        const { result } = renderHook(
            () => useModelStreamingQuery('Bedrock', '', BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS),
            { wrapper }
        );

        // Verify that the API was called with inference-profile
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for Bedrock with OTHER_FOUNDATION_MODELS even when modelId is not provided', async () => {
        const { result } = renderHook(
            () => useModelStreamingQuery('Bedrock', '', BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS),
            { wrapper }
        );

        // Verify that the API was called with inference-profile
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for SageMaker even when modelId is not provided', async () => {
        // Mock the MODEL_PROVIDER_NAME_MAP.SageMaker value to ensure it matches exactly
        const sageMakerProvider = 'SageMaker';

        const { result } = renderHook(() => useModelStreamingQuery(sageMakerProvider, '', ''), { wrapper });

        // Verify that the API was called
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
    });
});

describe('When using hook to fetch model temperature', () => {
    const mockAPI = {
        get: jest.fn()
    };

    let wrapper: any;

    beforeEach(() => {
        const queryClient = new QueryClient();
        mockAPI.get.mockResolvedValue({
            'MinTemperature': '0',
            'MaxTemperature': '1',
            'DefaultTemperature': '1'
        });
        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('it should return model temperature info with default bedrockInferenceType', async () => {
        const { result } = renderHook(
            () => useModelTemperatureQuery('Bedrock', 'model-1', BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should use inference-profile for PROVISIONED_MODELS', async () => {
        const { result } = renderHook(
            () => useModelTemperatureQuery('Bedrock', 'model-1', BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for Bedrock with INFERENCE_PROFILES even when modelId is not provided', async () => {
        const { result } = renderHook(
            () => useModelTemperatureQuery('Bedrock', '', BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES),
            { wrapper }
        );

        // Verify that the API was called with inference-profile
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for Bedrock with PROVISIONED_MODELS even when modelId is not provided', async () => {
        const { result } = renderHook(
            () => useModelTemperatureQuery('Bedrock', '', BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS),
            { wrapper }
        );

        // Verify that the API was called with inference-profile
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for Bedrock with OTHER_FOUNDATION_MODELS even when modelId is not provided', async () => {
        const { result } = renderHook(
            () => useModelTemperatureQuery('Bedrock', '', BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS),
            { wrapper }
        );

        // Verify that the API was called with inference-profile
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/inference-profile', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('it should make API call for SageMaker even when modelId is not provided', async () => {
        // Mock the MODEL_PROVIDER_NAME_MAP.SageMaker value to ensure it matches exactly
        const sageMakerProvider = 'SageMaker';

        const { result } = renderHook(() => useModelTemperatureQuery(sageMakerProvider, '', ''), { wrapper });

        // Verify that the API was called
        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalled();
        });
    });
});

describe('When using hook to fetch the model providers', () => {
    const mockAPI = {
        get: jest.fn()
    };

    let wrapper: any;

    beforeEach(() => {
        const queryClient = new QueryClient();
        mockAPI.get.mockResolvedValue(['Bedrock', 'SageMaker']);
        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('it should return model providers info', async () => {
        const { result } = renderHook(() => useModelProvidersQuery('Chat'), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/providers', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });
});

describe('When using hook to fetch use case details', () => {
    const mockAPI = {
        get: vi.fn()
    };

    let wrapper: any;
    const mockUseCaseId = 'test-use-case-id';
    const mockUseCaseData = {
        id: mockUseCaseId,
        name: 'Test Use Case',
        description: 'This is a test use case',
        status: 'ACTIVE'
    };

    beforeEach(() => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false
                }
            }
        });
        mockAPI.get.mockResolvedValue(mockUseCaseData);
        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('it should return use case details', async () => {
        const { result } = renderHook(() => useUseCaseDetailsQuery(mockUseCaseId, 'Text'), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

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

        expect(result.current.data).toEqual(mockUseCaseData);
    });

    test('it should not fetch when useCaseId is empty', async () => {
        const { result } = renderHook(() => useUseCaseDetailsQuery('', 'Text'), { wrapper });

        // The query should be disabled
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetched).toBe(false);
        expect(mockAPI.get).not.toHaveBeenCalled();
    });

    test('it should respect the enabled option', async () => {
        const { result } = renderHook(() => useUseCaseDetailsQuery(mockUseCaseId, 'Text', { enabled: false }), { wrapper });

        // The query should be disabled
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetched).toBe(false);
        expect(mockAPI.get).not.toHaveBeenCalled();
    });

    test('it should handle API errors', async () => {
        const mockError = new Error('API error');
        mockAPI.get.mockRejectedValue(mockError);

        // Create a new QueryClient with specific error handling configuration
        const errorQueryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    throwOnError: false
                }
            }
        });

        const errorWrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={errorQueryClient}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useUseCaseDetailsQuery(mockUseCaseId, 'Text'), {
            wrapper: errorWrapper
        });

        // Wait for the error state to be set
        await waitFor(
            () => {
                return result.current.isError === true;
            },
            { timeout: 3000 } // Increase timeout to give more time for error to propagate
        );

        expect(result.current.error).toBeDefined();
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
    });

    test('it should use the correct query key', async () => {
        const queryClient = new QueryClient();

        const customWrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        // Render the hook
        renderHook(() => useUseCaseDetailsQuery(mockUseCaseId, 'Text'), { wrapper: customWrapper });

        // Wait for the query to be processed
        await waitFor(() => {
            const queries = queryClient.getQueriesData({ queryKey: ['useCaseDetails'] });
            return queries.length > 0;
        });

        // Check if the query exists with the correct key
        const queries = queryClient.getQueriesData({ queryKey: ['useCaseDetails'] });
        const hasCorrectKey = queries.some(
            ([key]) => Array.isArray(key) && key[0] === 'useCaseDetails' && key[1] === mockUseCaseId
        );

        expect(hasCorrectKey).toBe(true);
    });
});

describe('When using hook to fetch MCP servers', () => {
    const mockAPI = {
        get: vi.fn()
    };

    let wrapper: any;
    const mockMcpServersData = {
        mcpServers: [
            {
                useCaseId: 'mcp-healthcare-001',
                useCaseName: 'Healthcare Management System',
                url: 'https://api.healthcare.example.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            },
            {
                useCaseId: 'mcp-database-001',
                useCaseName: 'Database Connector',
                url: 'https://api.database.example.com/mcp',
                type: 'runtime',
                status: 'ACTIVE'
            },
            {
                useCaseId: 'mcp-finance-001',
                useCaseName: 'Financial Services',
                url: 'https://api.finance.example.com/mcp',
                type: 'gateway',
                status: 'INACTIVE'
            },
            {
                useCaseId: 'mcp-weather-001',
                useCaseName: 'Weather API',
                url: 'https://api.weather.example.com/mcp',
                type: 'runtime',
                status: 'ACTIVE'
            }
        ],
        strandsTools: [
            {
                name: 'Calculator',
                description: 'Perform mathematical calculations and operations',
                value: 'calculator',
                category: 'Math',
                isDefault: true
            },
            {
                name: 'Current Time',
                description: 'Get current date and time information',
                value: 'current_time',
                category: 'Utilities',
                isDefault: true
            },
            {
                name: 'Environment',
                description: 'Access environment variables and system information',
                value: 'environment',
                category: 'System',
                isDefault: false
            }
        ]
    };

    beforeEach(() => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false
                }
            }
        });
        mockAPI.get.mockResolvedValue(mockMcpServersData);
        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('it should return MCP servers list', async () => {
        const { result } = renderHook(() => useMcpServersQuery(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockMcpServersData);
    });

    test('it should respect the enabled option', async () => {
        const { result } = renderHook(() => useMcpServersQuery({ enabled: false }), { wrapper });

        // The query should be disabled
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetched).toBe(false);
        expect(mockAPI.get).not.toHaveBeenCalled();
    });

    test('it should handle API errors', async () => {
        const mockError = new Error('API error');
        mockAPI.get.mockRejectedValue(mockError);

        const errorQueryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    throwOnError: false
                }
            }
        });

        const errorWrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={errorQueryClient}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useMcpServersQuery(), {
            wrapper: errorWrapper
        });

        await waitFor(
            () => {
                return result.current.isError === true;
            },
            { timeout: 3000 }
        );

        expect(result.current.error).toBeDefined();
    });
});

describe('When using hook to fetch MCP server details', () => {
    const mockAPI = {
        get: vi.fn()
    };

    let wrapper: any;
    const mockMcpId = 'mcp-healthcare-001';
    const mockMcpServersData = {
        mcpServers: [
            {
                useCaseId: 'mcp-healthcare-001',
                useCaseName: 'Healthcare Management System',
                url: 'https://api.healthcare.example.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            },
            {
                useCaseId: 'mcp-database-001',
                useCaseName: 'Database Connector',
                url: 'https://api.database.example.com/mcp',
                type: 'runtime',
                status: 'ACTIVE'
            },
            {
                useCaseId: 'mcp-weather-001',
                useCaseName: 'Weather API',
                url: 'https://api.weather.example.com/mcp',
                type: 'runtime',
                status: 'ACTIVE'
            }
        ],
        strandsTools: [
            {
                name: 'Calculator',
                description: 'Perform mathematical calculations and operations',
                value: 'calculator',
                category: 'Math',
                isDefault: true
            },
            {
                name: 'Current Time',
                description: 'Get current date and time information',
                value: 'current_time',
                category: 'Utilities',
                isDefault: true
            }
        ]
    };
    const mockMcpServerData = {
        useCaseId: mockMcpId,
        useCaseName: 'Healthcare Management System',
        url: 'https://api.healthcare.example.com/mcp',
        type: 'gateway',
        status: 'ACTIVE'
    };

    beforeEach(() => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false
                }
            }
        });
        mockAPI.get.mockResolvedValue(mockMcpServersData);
        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('it should return MCP server details', async () => {
        const { result } = renderHook(() => useMcpServerDetailsQuery(mockMcpId), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockMcpServerData);
    });

    test('it should not fetch when mcpId is empty', async () => {
        const { result } = renderHook(() => useMcpServerDetailsQuery(''), { wrapper });

        // The query should be disabled
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetched).toBe(false);
        expect(mockAPI.get).not.toHaveBeenCalled();
    });

    test('it should respect the enabled option', async () => {
        const { result } = renderHook(() => useMcpServerDetailsQuery(mockMcpId, { enabled: false }), { wrapper });

        // The query should be disabled
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetched).toBe(false);
        expect(mockAPI.get).not.toHaveBeenCalled();
    });

    test('it should handle API errors', async () => {
        const mockError = new Error('API error');
        mockAPI.get.mockRejectedValue(mockError);

        const errorQueryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    throwOnError: false
                }
            }
        });

        const errorWrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={errorQueryClient}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useMcpServerDetailsQuery(mockMcpId), {
            wrapper: errorWrapper
        });

        await waitFor(
            () => {
                return result.current.isError === true;
            },
            { timeout: 3000 }
        );

        expect(result.current.error).toBeDefined();
    });

    test('it should use the correct query key', async () => {
        const queryClient = new QueryClient();

        const customWrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        renderHook(() => useMcpServerDetailsQuery(mockMcpId), { wrapper: customWrapper });

        await waitFor(() => {
            const queries = queryClient.getQueriesData({ queryKey: ['mcpServerDetails'] });
            return queries.length > 0;
        });

        const queries = queryClient.getQueriesData({ queryKey: ['mcpServerDetails'] });
        const hasCorrectKey = queries.some(
            ([key]) => Array.isArray(key) && key[0] === 'mcpServerDetails' && key[1] === mockMcpId
        );

        expect(hasCorrectKey).toBe(true);
    });
});

describe('When using hook to fetch agent resources', () => {
    const mockAPI = {
        get: vi.fn()
    };

    let wrapper: any;
    const mockMcpServersData = {
        mcpServers: [
            {
                useCaseId: 'mcp-healthcare-001',
                useCaseName: 'Healthcare Management System',
                url: 'https://api.healthcare.example.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            },
            {
                useCaseId: 'mcp-database-001',
                useCaseName: 'Database Connector',
                url: 'https://api.database.example.com/mcp',
                type: 'runtime',
                status: 'ACTIVE'
            },
            {
                useCaseId: 'mcp-weather-001',
                useCaseName: 'Weather API',
                url: 'https://api.weather.example.com/mcp',
                type: 'runtime',
                status: 'ACTIVE'
            }
        ],
        strandsTools: [
            {
                name: 'HTTP Request',
                value: 'http_request',
                description: 'Make HTTP requests to external APIs and web services',
                category: 'Network',
                isDefault: false,
                type: 'STRANDS_TOOL'
            },
            {
                name: 'Date/Time Utils',
                value: 'current_time',
                description: 'Date and time manipulation utilities',
                category: 'Utilities',
                isDefault: true,
                type: 'STRANDS_TOOL'
            },
            {
                name: 'Math Operations',
                value: 'calculator',
                description: 'Mathematical calculations and operations',
                category: 'Math',
                isDefault: true,
                type: 'STRANDS_TOOL'
            }
        ]
    };
    const mockAgentResourcesData = [
        {
            label: 'MCP Servers',
            options: [
                {
                    label: 'GATEWAY: Healthcare Management System',
                    value: 'mcp-healthcare-001',
                    description: 'https://api.healthcare.example.com/mcp',
                    useCaseId: 'mcp-healthcare-001',
                    useCaseName: 'Healthcare Management System',
                    url: 'https://api.healthcare.example.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE',
                    iconName: 'share'
                },
                {
                    label: 'RUNTIME: Database Connector',
                    value: 'mcp-database-001',
                    description: 'https://api.database.example.com/mcp',
                    useCaseId: 'mcp-database-001',
                    useCaseName: 'Database Connector',
                    url: 'https://api.database.example.com/mcp',
                    type: 'runtime',
                    status: 'ACTIVE',
                    iconName: 'share'
                },
                {
                    label: 'RUNTIME: Weather API',
                    value: 'mcp-weather-001',
                    description: 'https://api.weather.example.com/mcp',
                    useCaseId: 'mcp-weather-001',
                    useCaseName: 'Weather API',
                    url: 'https://api.weather.example.com/mcp',
                    type: 'runtime',
                    status: 'ACTIVE',
                    iconName: 'share'
                }
            ]
        },
        {
            label: 'Tools provided out of the box',
            options: [
                {
                    label: 'HTTP Request',
                    value: 'http_request',
                    description: 'Make HTTP requests to external APIs and web services',
                    iconName: 'settings',
                    type: 'STRANDS_TOOL'
                },
                {
                    label: 'Date/Time Utils',
                    value: 'current_time',
                    description: 'Date and time manipulation utilities',
                    iconName: 'settings',
                    type: 'STRANDS_TOOL'
                },
                {
                    label: 'Math Operations',
                    value: 'calculator',
                    description: 'Mathematical calculations and operations',
                    iconName: 'settings',
                    type: 'STRANDS_TOOL'
                }
            ]
        }
    ];

    beforeEach(() => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false
                }
            }
        });

        mockAPI.get.mockResolvedValue(mockMcpServersData);
        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('it should return formatted agent resources', async () => {
        const { result } = renderHook(() => useAgentResourcesQuery(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        // Hook now returns an object with formatted and raw properties
        expect(result.current.data).toHaveProperty('formatted');
        expect(result.current.data).toHaveProperty('raw');
        expect(result.current.data?.formatted).toEqual(mockAgentResourcesData);
        expect(result.current.data?.raw).toEqual(mockMcpServersData);
    });

    test('it should respect the enabled option', async () => {
        const { result } = renderHook(() => useAgentResourcesQuery({ enabled: false }), { wrapper });

        // The query should be disabled
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetched).toBe(false);
        expect(mockAPI.get).not.toHaveBeenCalled();
    });

    test('it should handle API errors', async () => {
        const mockError = new Error('API error');
        mockAPI.get.mockRejectedValue(mockError);

        const errorQueryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    throwOnError: false
                }
            }
        });

        const errorWrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={errorQueryClient}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useAgentResourcesQuery(), {
            wrapper: errorWrapper
        });

        await waitFor(
            () => {
                return result.current.isError === true;
            },
            { timeout: 3000 }
        );

        expect(result.current.error).toBeDefined();
    });

    test('it should use the correct query key', async () => {
        const queryClient = new QueryClient();

        const customWrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        renderHook(() => useAgentResourcesQuery(), { wrapper: customWrapper });

        await waitFor(() => {
            const queries = queryClient.getQueriesData({ queryKey: ['agentResources'] });
            return queries.length > 0;
        });

        const queries = queryClient.getQueriesData({ queryKey: ['agentResources'] });
        const hasCorrectKey = queries.some(([key]) => Array.isArray(key) && key[0] === 'agentResources');

        expect(hasCorrectKey).toBe(true);
    });
});
