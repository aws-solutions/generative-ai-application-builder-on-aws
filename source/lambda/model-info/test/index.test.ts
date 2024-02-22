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
 *********************************************************************************************************************/

import { DynamoDBClient, QueryCommand, GetItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { APIGatewayEvent } from 'aws-lambda';
import { MODEL_INFO_TABLE_NAME_ENV_VAR } from '../utils/constants';
import {
    ddbGetModelInfoResponse,
    ddbGetModelsResponse,
    ddbGetProvidersResponse,
    ddbGetUseCaseTypesResponse
} from './event-test-data';

describe('When invoking the lambda function', () => {
    const ddbMockedClient = mockClient(DynamoDBClient);

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.0.0" }`;
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'fake-model-table';
    });

    describe('on success', () => {
        beforeEach(() => {
            ddbMockedClient.reset();
        });

        it('should get use case types', async () => {
            let lambda = import('../index');

            ddbMockedClient.on(ScanCommand).resolves(ddbGetUseCaseTypesResponse);

            const mockedEvent = {
                resource: '/model-info/use-case-types',
                pathParameters: { useCaseType: 'Chat' },
                httpMethod: 'GET'
            } as Partial<APIGatewayEvent>;

            expect(await (await lambda).lambdaHandler(mockedEvent as APIGatewayEvent)).toEqual({
                'body': '["Chat","RAGChat"]',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should get providers', async () => {
            let lambda = import('../index');

            ddbMockedClient.on(QueryCommand).resolves(ddbGetProvidersResponse);

            const mockedEvent = {
                resource: '/model-info/{useCaseType}/providers',
                pathParameters: { useCaseType: 'Chat' },
                httpMethod: 'GET'
            } as Partial<APIGatewayEvent>;

            expect(await (await lambda).lambdaHandler(mockedEvent as APIGatewayEvent)).toEqual({
                'body': '["Anthropic","Bedrock","HuggingFace"]',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should get models', async () => {
            let lambda = import('../index');

            ddbMockedClient.on(QueryCommand).resolves(ddbGetModelsResponse);

            const mockedEvent = {
                resource: '/model-info/{useCaseType}/{providerName}',
                pathParameters: { useCaseType: 'Chat', providerName: 'Bedrock' },
                httpMethod: 'GET'
            } as Partial<APIGatewayEvent>;

            expect(await (await lambda).lambdaHandler(mockedEvent as APIGatewayEvent)).toEqual({
                'body': '["model1","model2","model3"]',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should handle special encoded characters', async () => {
            let lambda = import('../index');

            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': 'fake-model-table',
                    'Key': { 'UseCase': { 'S': 'cha?t' }, 'SortKey': { 'S': 'bedr?ock#some/special/?model' } }
                })
                .resolves(ddbGetModelInfoResponse);

            const mockedEvent = {
                resource: '/model-info/{useCaseType}/{providerName}/{modelId}',
                pathParameters: {
                    useCaseType: encodeURIComponent('cha?t'),
                    providerName: encodeURIComponent('bedr?ock'),
                    modelId: encodeURIComponent('some/special/?model')
                },
                httpMethod: 'GET'
            } as Partial<APIGatewayEvent>;

            expect(await (await lambda).lambdaHandler(mockedEvent as APIGatewayEvent)).toEqual({
                'body': '{"UseCase":"Chat","SortKey":"Bedrock#amazon.titan-text-express-v1","AllowsStreaming":true,"DefaultTemperature":"0.5","MaxChatMessageSize":2500,"MaxPromptSize":2000,"MaxTemperature":"1","MemoryConfig":{"ai_prefix":"Bot","context":null,"history":"history","human_prefix":"User","input":"input","output":null},"MinTemperature":"0","ModelName":"amazon.titan-text-express-v1","ModelProviderName":"Bedrock","Prompt":"{history}\\n\\n{input}"}',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        afterAll(() => {
            ddbMockedClient.reset();
        });
    });

    describe('on failure from missing env vars', () => {
        beforeAll(() => {
            delete process.env[MODEL_INFO_TABLE_NAME_ENV_VAR];
        });

        it('Should fail to invoke lambda since env is not set up correctly', async () => {
            let lambda = import('../index');

            const mockedEvent = {
                resource: '/model-info/{useCaseType}/{providerName}/{modelId}',
                pathParameters: { useCaseType: 'Chat', providerName: 'Bedrock', modelId: 'model1' },
                httpMethod: 'GET'
            } as Partial<APIGatewayEvent>;

            await expect((await lambda).lambdaHandler(mockedEvent as APIGatewayEvent)).rejects.toThrowError(
                'Missing required environment variables: MODEL_INFO_TABLE_NAME. This should not happen and indicates in issue with your deployment.'
            );
        });

        afterAll(() => {
            process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'fake-model-table';
        });
    });

    describe('on failures', () => {
        it('Should fail from bad request type', async () => {
            let lambda = import('../index');

            const mockedEvent = {
                resource: '/model-info/{useCaseType}/{providerName}/{modelId}',
                pathParameters: { useCaseType: 'Chat', providerName: 'Bedrock', modelId: 'model1' },
                httpMethod: 'POST'
            } as Partial<APIGatewayEvent>;

            expect(await (await lambda).lambdaHandler(mockedEvent as APIGatewayEvent)).toEqual({
                'body': 'Invalid HTTP method: POST, at resource: /model-info/{useCaseType}/{providerName}/{modelId}',
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'text/plain',
                    'x-amzn-ErrorType': 'CustomExecutionError'
                },
                'isBase64Encoded': false,
                'statusCode': '400'
            });
        });

        it('should fail from non existent resource', async () => {
            let lambda = import('../index');

            const mockedEvent = {
                resource: '/model-info/{useCaseType}/{providerName}/{somethingElse}',
                pathParameters: { useCaseType: 'Chat', providerName: 'Bedrock', modelId: 'model1' },
                httpMethod: 'GET'
            } as Partial<APIGatewayEvent>;

            expect(await (await lambda).lambdaHandler(mockedEvent as APIGatewayEvent)).toEqual({
                'body': 'Invalid resource: /model-info/{useCaseType}/{providerName}/{somethingElse}',
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'text/plain',
                    'x-amzn-ErrorType': 'CustomExecutionError'
                },
                'isBase64Encoded': false,
                'statusCode': '400'
            });
        });

        it('On some internal failure', async () => {
            let lambda = import('../index');

            const mockedEvent = {
                resource: '/model-info/{useCaseType}/{providerName}/{modelId}',
                pathParameters: { useCaseType: 'Chat', providerName: 'Bedrock', modelId: 'model1' },
                httpMethod: 'GET'
            } as Partial<APIGatewayEvent>;

            expect(await (await lambda).lambdaHandler(mockedEvent as APIGatewayEvent)).toEqual({
                'body': 'Internal Error - Please contact support and quote the following trace id: undefined',
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'text/plain',
                    '_X_AMZN_TRACE_ID': undefined,
                    'x-amzn-ErrorType': 'CustomExecutionError'
                },
                'isBase64Encoded': false,
                'statusCode': '400'
            });
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[MODEL_INFO_TABLE_NAME_ENV_VAR];

        ddbMockedClient.restore();
    });
});
