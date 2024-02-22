/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import { renderHook, waitFor } from '@testing-library/react';
import {
    useModelNameQuery,
    useModelInfoQuery,
    useModelStreamingQuery,
    useModelTemperatureQuery,
    useModelProvidersQuery
} from '../useQueries';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { API, Auth } from 'aws-amplify';
import { API_NAME } from '@/utils/constants';
import { mockedAuthenticator } from '@/utils';

jest.mock('@aws-amplify/api');

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

    test('it should return model info', async () => {
        const { result } = renderHook(() => useModelInfoQuery('Bedrock', 'model-1'), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/model-1', {
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

    test('it should return model streaming info', async () => {
        const { result } = renderHook(() => useModelStreamingQuery('Bedrock', 'model-1'), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/model-1', {
            headers: {
                Authorization: 'fake-token'
            }
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

    test('it should return model temperature info', async () => {
        const { result } = renderHook(() => useModelTemperatureQuery('Bedrock', 'model-1'), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/model-1', {
            headers: {
                Authorization: 'fake-token'
            }
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
        mockAPI.get.mockResolvedValue(['Bedrock', 'Anthropic', 'HuggingFace', 'HuggingFace-InferenceEndpoint']);
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
