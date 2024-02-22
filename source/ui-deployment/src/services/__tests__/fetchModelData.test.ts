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

import { API_NAME } from '@/utils/constants';
import {
    fetchModelDefaults,
    fetchModelIds,
    fetchModelInfoApiRoutes,
    fetchModelProviders,
    fetchModelStreamingDefault,
    encodeQueryParams,
    fetchModelTemperatureRange,
    setDefaultQueryParams
} from '../fetchModelData';
import { API, Auth } from 'aws-amplify';
import { mockedAuthenticator } from '@/utils';

jest.mock('@aws-amplify/api');

describe('When setting default query params', () => {
    test('should set default query params for modelName', () => {
        const params = setDefaultQueryParams({ useCaseType: 'Chat', providerName: 'SageMaker' });
        expect(params).toEqual({
            useCaseType: 'Chat',
            providerName: 'SageMaker',
            modelId: 'default'
        });
    });

    test('should set default query params for multiple params', () => {
        const params = setDefaultQueryParams({ providerName: 'SageMaker' });
        expect(params).toEqual({
            useCaseType: 'Chat',
            providerName: 'SageMaker',
            modelId: 'default'
        });
    });
});

describe('When encoding query params', () => {
    test('should encode backslashes properly', () => {
        const encoded = encodeQueryParams({
            useCaseType: 'Chat\\',
            providerName: 'HuggingFace',
            modelId: 'google/flan-t5-base'
        });
        expect(encoded.useCaseType).toEqual('Chat%5C');
        expect(encoded.modelId).toEqual('google%2Fflan-t5-base');
    });
});

describe('When creating api routes', () => {
    test('should return the correct api routes for model provider', () => {
        const apiRoutes = fetchModelInfoApiRoutes.modelProviders.route({ useCaseType: 'Chat' });
        expect(apiRoutes).toEqual(`/model-info/Chat/providers`);
    });

    test('should return the correct api routes for model ids', () => {
        const apiRoutes = fetchModelInfoApiRoutes.modelIds.route({ useCaseType: 'Chat', providerName: 'Bedrock' });
        expect(apiRoutes).toEqual(`/model-info/Chat/Bedrock`);
    });

    test('should return the correct api routes for model data', () => {
        const apiRoutes = fetchModelInfoApiRoutes.modelInfo.route({
            useCaseType: 'Chat',
            providerName: 'Bedrock',
            modelId: 'titan-express'
        });
        expect(apiRoutes).toEqual(`/model-info/Chat/Bedrock/titan-express`);
    });
});

describe('When fetching model providers data using API', () => {
    const mockAPI = {
        get: jest.fn()
    };

    beforeEach(() => {
        mockAPI.get.mockResolvedValue(['HuggingFace', 'Bedrock', 'Anthropic']);

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return the correct data', async () => {
        const data = await fetchModelProviders({ useCaseType: 'Chat' });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/providers', {
            headers: {
                Authorization: 'fake-token'
            }
        });

        console.log('data: ', data);
        expect(data).toEqual(['HuggingFace', 'Bedrock', 'Anthropic']);
    });

    test('should throw an error if useCaseType is undefined', async () => {
        await expect(fetchModelProviders({ useCaseType: undefined })).rejects.toThrow(Error);
    });
});

describe('When fetching model ids using API', () => {
    const mockAPI = {
        get: jest.fn()
    };

    const mockModelIds = [
        'ai21.j2-ultra',
        'ai21.j2-mid',
        'amazon.titan-text-express-v1',
        'anthropic.claude-v1',
        'anthropic.claude-v2',
        'anthropic.claude-instant-v1'
    ];

    beforeEach(() => {
        mockAPI.get.mockResolvedValue(mockModelIds);

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return the correct data', async () => {
        const data = await fetchModelIds({ useCaseType: 'Chat', providerName: 'Bedrock' });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock', {
            headers: {
                Authorization: 'fake-token'
            }
        });

        expect(data).toEqual(mockModelIds);
    });

    test('should throw an error if providerName is undefined', async () => {
        await expect(fetchModelIds({ useCaseType: 'Chat', providerName: undefined })).rejects.toThrow(Error);
    });

    test('should throw an error if useCaseType is undefined', async () => {
        await expect(fetchModelIds({ useCaseType: undefined, providerName: 'Bedrock' })).rejects.toThrow(Error);
    });
});

describe('When fetching model data using API', () => {
    const mockAPI = {
        get: jest.fn()
    };

    const mockModelData = {
        'MaxPromptSize': 2000,
        'Prompt': '\fake-prompt',
        'AllowsStreaming': true,
        'MaxTemperature': '1',
        'UseCase': 'Chat',
        'SortKey': 'Bedrock#anthropic.claude-v1',
        'ModelName': 'anthropic.claude-v1',
        'ModelProviderName': 'Bedrock',
        'MinTemperature': '0',
        'DefaultTemperature': '1',
        'MemoryConfig': {
            'context': null,
            'output': null,
            'input': 'input',
            'history': 'history',
            'human_prefix': 'H',
            'ai_prefix': 'A'
        },
        'MaxChatMessageSize': 2500
    };

    beforeEach(() => {
        mockAPI.get.mockResolvedValue(mockModelData);

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return the correct data', async () => {
        const data = await fetchModelDefaults({
            useCaseType: 'Chat',
            providerName: 'Bedrock',
            modelId: 'titan-express'
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/titan-express', {
            headers: {
                Authorization: 'fake-token'
            }
        });
        expect(data).toEqual(mockModelData);
    });

    test('should throw an error if modelId is undefined', async () => {
        await expect(
            fetchModelDefaults({
                useCaseType: 'Chat',
                providerName: 'Bedrock',
                modelId: undefined
            })
        ).rejects.toThrow(Error);
    });

    test('should throw an error if providerName is undefined', async () => {
        await expect(
            fetchModelDefaults({
                useCaseType: 'Chat',
                providerName: undefined,
                modelId: 'titan-express'
            })
        ).rejects.toThrow(Error);
    });

    test('should throw an error if useCaseType is undefined', async () => {
        await expect(
            fetchModelDefaults({
                useCaseType: undefined,
                providerName: 'Bedrock',
                modelId: 'titan-express'
            })
        ).rejects.toThrow(Error);
    });
});

describe('When fetching model streaming default using API', () => {
    const mockAPI = {
        get: jest.fn()
    };

    beforeEach(() => {
        mockAPI.get.mockResolvedValue({
            'AllowsStreaming': true
        });

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return the correct data', async () => {
        const data = await fetchModelStreamingDefault({
            useCaseType: 'Chat',
            providerName: 'Bedrock',
            modelId: 'titan-express'
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/titan-express', {
            headers: {
                Authorization: 'fake-token'
            }
        });
        expect(data).toEqual(true);
    });

    test('should return huggingface model data correctly', async () => {
        mockAPI.get.mockResolvedValue({
            'AllowsStreaming': false
        });

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        const data = await fetchModelStreamingDefault({
            useCaseType: 'Chat',
            providerName: 'HuggingFace',
            modelId: 'google/flan-t5-base'
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/HuggingFace/google%2Fflan-t5-base', {
            headers: {
                Authorization: 'fake-token'
            }
        });
        expect(data).toEqual(false); // HuggingFace models do not support streaming by default.
    });
});

describe('When fetching model temperature defaults using API', () => {
    const mockAPI = {
        get: jest.fn()
    };

    beforeEach(() => {
        mockAPI.get.mockResolvedValue({
            'MinTemperature': '0',
            'MaxTemperature': '1',
            'DefaultTemperature': '1'
        });

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return the correct data', async () => {
        const data = await fetchModelTemperatureRange({
            useCaseType: 'Chat',
            providerName: 'Bedrock',
            modelId: 'titan-express'
        });
        expect(mockAPI.get).toHaveBeenCalledTimes(1);
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/model-info/Chat/Bedrock/titan-express', {
            headers: {
                Authorization: 'fake-token'
            }
        });
        expect(data).toEqual({
            'MinTemperature': 0,
            'MaxTemperature': 1,
            'DefaultTemperature': 1
        });
    });

    test('should throw error if MinTemperature missing in api response', async () => {
        mockAPI.get.mockResolvedValue({
            'MaxTemperature': '1',
            'DefaultTemperature': '1'
        });

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();

        await expect(
            fetchModelTemperatureRange({
                useCaseType: 'Chat',
                providerName: 'Bedrock',
                modelId: 'titan-express'
            })
        ).rejects.toThrow(Error);
    });
});
