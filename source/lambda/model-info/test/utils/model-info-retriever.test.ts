// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { DynamoDBClient, QueryCommand, GetItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { ModelInfoRetriever } from '../../utils/model-info-retriever';
import {
    ddbGetModelInfoResponse,
    ddbGetModelsResponse,
    ddbGetProvidersMultiPartResponse1,
    ddbGetProvidersMultiPartResponse2,
    ddbGetProvidersResponse,
    ddbGetUseCaseTypesResponse,
    ddbGetUseCaseTypesResponseMultiPart
} from '../event-test-data';
import { unmarshall } from '@aws-sdk/util-dynamodb';

describe('When performing ddb operations', () => {
    let ddbMockedClient: any;
    let modelInfoRetriever: ModelInfoRetriever;

    beforeEach(() => {
        ddbMockedClient.reset();
    });

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        ddbMockedClient = mockClient(DynamoDBClient);
        modelInfoRetriever = new ModelInfoRetriever(ddbMockedClient);
    });

    it('getUseCaseTypes succeeds', async () => {
        ddbMockedClient.on(ScanCommand).resolves(ddbGetUseCaseTypesResponse);
        const useCaseTypes = await modelInfoRetriever.getUseCaseTypes();
        expect(ddbMockedClient).toHaveReceivedCommand(ScanCommand);
        expect(useCaseTypes).toEqual(['Chat', 'RAGChat']);
    });

    it('getUseCaseTypes causes a paginated query', async () => {
        ddbMockedClient
            .on(ScanCommand)
            .resolvesOnce(ddbGetUseCaseTypesResponseMultiPart)
            .resolves(ddbGetUseCaseTypesResponse);
        const useCaseTypes = await modelInfoRetriever.getUseCaseTypes();
        expect(ddbMockedClient).toHaveReceivedCommandTimes(ScanCommand, 2);
        expect(useCaseTypes).toEqual(['Chat', 'RAGChat']);
    });

    it('getUseCaseTypes returns nothing', async () => {
        ddbMockedClient.on(ScanCommand).resolves({});
        const useCaseTypes = await modelInfoRetriever.getUseCaseTypes();
        expect(ddbMockedClient).toHaveReceivedCommand(ScanCommand);
        expect(useCaseTypes).toEqual([]);
    });

    it('getUseCaseTypes errors out', async () => {
        ddbMockedClient.on(ScanCommand).rejects('fake error');
        await expect(modelInfoRetriever.getUseCaseTypes()).rejects.toThrow();
        expect(ddbMockedClient).toHaveReceivedCommand(ScanCommand);
    });

    it('getModelProviders succeeds', async () => {
        ddbMockedClient.on(QueryCommand).resolves(ddbGetProvidersResponse);
        const modelProviders = await modelInfoRetriever.getModelProviders('Chat');
        expect(ddbMockedClient).toHaveReceivedCommand(QueryCommand);
        expect(modelProviders).toEqual(['Bedrock', 'SageMaker']);
    });

    it('getModelProviders causes a paginated query', async () => {
        ddbMockedClient
            .on(QueryCommand)
            .resolvesOnce(ddbGetProvidersMultiPartResponse1)
            .resolves(ddbGetProvidersMultiPartResponse2);
        const modelProviders = await modelInfoRetriever.getModelProviders('Chat');
        expect(ddbMockedClient).toHaveReceivedCommandTimes(QueryCommand, 2);
        expect(modelProviders).toEqual(['Bedrock', 'SageMaker']);
    });

    it('getModelProviders fails for a bad use case, returning nothing', async () => {
        ddbMockedClient.on(QueryCommand).resolves({});
        const modelProviders = await modelInfoRetriever.getModelProviders('fake-use-case');
        expect(ddbMockedClient).toHaveReceivedCommand(QueryCommand);
        expect(modelProviders).toEqual([]);
    });

    it('getModelProviders errors out', async () => {
        ddbMockedClient.on(QueryCommand).rejects('fake error');
        await expect(modelInfoRetriever.getModelProviders('fake-use-case')).rejects.toThrow();
        expect(ddbMockedClient).toHaveReceivedCommand(QueryCommand);
    });

    it('getModels succeeds', async () => {
        ddbMockedClient.on(QueryCommand).resolves(ddbGetModelsResponse);
        const models = await modelInfoRetriever.getModels('Chat', 'Anthropic');
        expect(ddbMockedClient).toHaveReceivedCommand(QueryCommand);
        expect(models).toEqual([
            {
                ModelName: 'model1',
                DisplayName: 'Model One',
                Description: 'This is model one description'
            },
            {
                ModelName: 'model2',
                DisplayName: 'Model Two',
                Description: ''
            },
            {
                ModelName: 'model3',
                DisplayName: 'model3',
                Description: ''
            }
        ]);
    });

    it('getModels fails returning nothing', async () => {
        ddbMockedClient.on(QueryCommand).resolves({});
        const models = await modelInfoRetriever.getModels('Chat', 'fake-provider');
        expect(ddbMockedClient).toHaveReceivedCommand(QueryCommand);
        expect(models).toEqual([]);
    });

    it('getModels errors out', async () => {
        ddbMockedClient.on(QueryCommand).rejects('fake error');
        await expect(modelInfoRetriever.getModels('Chat', 'fake-provider')).rejects.toThrow();
        expect(ddbMockedClient).toHaveReceivedCommand(QueryCommand);
    });

    it('getModelInfo succeeds', async () => {
        ddbMockedClient.on(GetItemCommand).resolves(ddbGetModelInfoResponse);
        const modelProviders = await modelInfoRetriever.getModelInfo('Chat', 'Anthropic', 'model1');
        expect(ddbMockedClient).toHaveReceivedCommand(GetItemCommand);
        expect(modelProviders).toEqual(unmarshall(ddbGetModelInfoResponse.Item));
    });

    it('getModelInfo fails returning nothing', async () => {
        ddbMockedClient.on(GetItemCommand).resolves({});
        const modelProviders = await modelInfoRetriever.getModelInfo('Chat', 'Anthropic', 'fake-model');
        expect(ddbMockedClient).toHaveReceivedCommand(GetItemCommand);
        expect(modelProviders).toEqual({});
    });

    it('getModelInfo errors out', async () => {
        ddbMockedClient.on(GetItemCommand).rejects('fake error');
        await expect(modelInfoRetriever.getModelInfo('Chat', 'fake-provider', 'fake-model')).rejects.toThrow();
        expect(ddbMockedClient).toHaveReceivedCommand(GetItemCommand);
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        ddbMockedClient.restore();
    });
});
