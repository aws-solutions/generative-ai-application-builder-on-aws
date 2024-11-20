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

import { DeleteItemInput, GetItemCommandInput, PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import {
    DeleteConfigItemBuilder,
    GetConfigItemBuilder,
    MarkItemForDeletionCommandBuilder,
    PutConfigItemBuilder
} from '../../ddb/use-case-config-operation-builder';
import { UseCase } from '../../model/use-case';
import {
    CHAT_PROVIDERS,
    CfnParameterKeys,
    DYNAMODB_TTL_ATTRIBUTE_NAME,
    TTL_SECONDS,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
} from '../../utils/constants';
import { createUseCaseEvent } from '../event-test-data';

describe('When creating the Use Case config ddb builder commands', () => {
    let config: any;
    let createEvent: any;
    let useCase: UseCase;
    let chatRecordKey: string;

    beforeAll(() => {
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';
        config = {
            ConversationMemoryType: 'DDBMemoryType',
            ConversationMemoryParams: 'ConversationMemoryParams',
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Kendra',
                NumberOfDocs: '5',
                ReturnSourceDocs: '5',
                BedrockKnowledgeBaseParams: { BedrockKnowledgeBaseId: 'fake-id', RetrievalFilter: {} }
            },
            LlmParams: {
                ModelProvider: CHAT_PROVIDERS.BEDROCK,
                BedrockLlmParams: {
                    ModelId: 'anthropic.claude-v1'
                },
                ModelParams: 'Param1',
                PromptParams: {
                    PromptTemplate: 'Prompt1'
                },
                Streaming: true,
                Temperature: 0.1
            }
        };

        chatRecordKey = '11111111-12345678';
        const cfnParameters = new Map<string, string>();
        cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, chatRecordKey);

        useCase = new UseCase(
            '11111111-2222-2222',
            'fake-test',
            'Create a stack for test',
            cfnParameters,
            config,
            'test-user',
            'FakeProvider',
            'Chat'
        );

        useCase.stackId = 'fake-stack-id';

        createEvent = createUseCaseEvent;
        createEvent.body = JSON.stringify(createUseCaseEvent.body);
    });

    afterAll(() => {
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
    });

    describe('When creating the PutItemCommandInput with a UseCase', () => {
        let putItemCommandInput: PutItemCommandInput;
        beforeAll(async () => {
            const createTableCommandInputBuilder = new PutConfigItemBuilder(useCase);
            putItemCommandInput = await createTableCommandInputBuilder.build();
        });

        it('should create the PutItemCommandInput', () => {
            expect(putItemCommandInput).toBeDefined();
            expect(putItemCommandInput.Item).toBeDefined();
            expect(putItemCommandInput.Item).toEqual(marshall({ key: chatRecordKey, config: config }));
        });
    });

    describe('When creating the GetItemCommandInput with a UseCase', () => {
        let getItemCommandInput: GetItemCommandInput;
        beforeAll(async () => {
            const createTableCommandInputBuilder = new GetConfigItemBuilder(useCase);
            getItemCommandInput = await createTableCommandInputBuilder.build();
        });

        it('should create the PutItemCommandInput', () => {
            expect(getItemCommandInput).toBeDefined();
            console.debug(getItemCommandInput);
            expect(getItemCommandInput.Key).toBeDefined();
            expect(getItemCommandInput.Key).toEqual(marshall({ key: chatRecordKey }));
        });
    });

    describe('When creating the DeleteItemCommandInput with a UseCase', () => {
        let deleteItemCommandInput: DeleteItemInput;
        beforeAll(async () => {
            const createTableCommandInputBuilder = new DeleteConfigItemBuilder(useCase);
            deleteItemCommandInput = await createTableCommandInputBuilder.build();
        });

        it('should create the PutItemCommandInput', () => {
            expect(deleteItemCommandInput).toBeDefined();
            expect(deleteItemCommandInput.Key).toBeDefined();
            expect(deleteItemCommandInput.Key).toEqual(marshall({ key: chatRecordKey }));
        });
    });

    describe('MarkItemForDeletionCommandBuilder', () => {
        let builder: MarkItemForDeletionCommandBuilder;
        let useCase: UseCase;

        beforeEach(() => {
            useCase = {
                getUseCaseConfigRecordKey: jest.fn().mockReturnValue('test-record-key'),
                userId: 'test-user-id'
            } as unknown as UseCase;
            builder = new MarkItemForDeletionCommandBuilder(useCase);
        });

        afterEach(() => {
            jest.resetAllMocks();
        });

        it('should build UpdateItemCommandInput correctly', async () => {
            process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'test-table-name';

            const result = await builder.build();

            expect(result.TableName).toEqual('test-table-name');
            expect(result.Key).toEqual({
                key: { S: 'test-record-key' }
            });
            expect(result.UpdateExpression).toEqual(
                'SET #TTL = :expiry_time, #DeletedBy = :user, #DeletedDate = :deletion_date'
            );
            expect(result.ExpressionAttributeNames).toEqual({
                '#TTL': DYNAMODB_TTL_ATTRIBUTE_NAME,
                '#DeletedBy': 'DeletedBy',
                '#DeletedDate': 'DeletedDate'
            });
        });
    });
});
