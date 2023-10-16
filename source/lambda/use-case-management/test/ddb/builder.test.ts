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

import {
    DeleteItemCommandInput,
    PutItemCommandInput,
    ScanCommandInput,
    UpdateItemCommandInput
} from '@aws-sdk/client-dynamodb';
import { APIGatewayEvent } from 'aws-lambda';
import {
    DeleteItemCommandBuilder,
    MarkItemForDeletionCommandBuilder,
    PutItemCommandInputBuilder,
    UpdateItemCommandBuilder
} from '../../ddb/storage-operation-builder';
import { ScanCaseTableCommandBuilder } from '../../ddb/storage-view-builder';
import { ListUseCasesAdapter } from '../../model/list-use-cases';
import { ChatUseCaseInfoAdapter, UseCase } from '../../model/use-case';
import {
    DDB_SCAN_RECORDS_LIMIT,
    DYNAMODB_TTL_ATTRIBUTE_NAME,
    USE_CASES_TABLE_NAME_ENV_VAR
} from '../../utils/constants';
import {
    createUseCaseEvent,
    deleteUseCaseEvent,
    permanentlyDeleteUseCaseEvent,
    updateUseCaseEvent
} from '../event-test-data';

describe('When creating StackCommandBuilders', () => {
    let createEvent: any;
    let updateEvent: any;
    let deleteEvent: any;
    let permanentDeleteEvent: any;

    beforeAll(() => {
        process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';

        createEvent = createUseCaseEvent;
        createEvent.body = JSON.stringify(createUseCaseEvent.body);

        updateEvent = updateUseCaseEvent;
        updateEvent.body = JSON.stringify(updateUseCaseEvent.body);

        deleteEvent = deleteUseCaseEvent;
        permanentDeleteEvent = permanentlyDeleteUseCaseEvent;
    });

    describe('When creating PutItemCommandInputBuilder with a UseCase', () => {
        let putItemCommandBuilder: PutItemCommandInput;

        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            cfnParameters.set('LLMProviderModelId', 'google/flan-t5-xxl');
            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                createEvent.body,
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.stackId = 'fake-stack-id';
            const putItemInputBuilder = new PutItemCommandInputBuilder(useCase);
            try {
                putItemCommandBuilder = await putItemInputBuilder.build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should create a PutItemCommandInputBuilder with the correct properties', () => {
            expect(putItemCommandBuilder.TableName).toEqual(process.env[USE_CASES_TABLE_NAME_ENV_VAR]);
            expect(putItemCommandBuilder.Item!.StackId.S).toEqual('fake-stack-id');
            expect(putItemCommandBuilder.Item!.Name.S).toEqual('fake-test');
            expect(putItemCommandBuilder.Item!.Description.S).toEqual('Create a stack for test');
            expect(putItemCommandBuilder.Item!.CreatedBy.S).toEqual('test-user');
        });
    });

    describe('When creating UpdateItemCommandBuilder with a UseCase', () => {
        let updateItemCommandInput: UpdateItemCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            cfnParameters.set('LLMProviderModelId', 'google/flan-t5-xxl');
            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                updateEvent.body,
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.stackId = 'fake-stack-id';
            try {
                updateItemCommandInput = await new UpdateItemCommandBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(updateItemCommandInput.TableName).toEqual(process.env[USE_CASES_TABLE_NAME_ENV_VAR]);
            expect(updateItemCommandInput.Key).toEqual({ 'UseCaseId': { 'S': 'fake-id' } });
            expect(updateItemCommandInput.UpdateExpression).toEqual(
                'SET #Description = :description, #UpdatedDate = :date, #UpdatedBy = :user, #SSMParameterKey = :ssm_parameter_key'
            );
            expect(updateItemCommandInput.ExpressionAttributeNames).toEqual({
                '#Description': 'Description',
                '#SSMParameterKey': 'SSMParameterKey',
                '#UpdatedDate': 'UpdatedDate',
                '#UpdatedBy': 'UpdatedBy'
            });
        });
    });

    describe('When creating DeleteItemCommandBuilder with a UseCase', () => {
        let deleteCommandInput: DeleteItemCommandInput;

        beforeAll(async () => {
            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                new Map<string, string>(),
                deleteEvent.body,
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.stackId = 'fake-stack-id';
            try {
                deleteCommandInput = await new DeleteItemCommandBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(deleteCommandInput.TableName).toEqual(process.env[USE_CASES_TABLE_NAME_ENV_VAR]);
            expect(deleteCommandInput.Key!.UseCaseId.S).toEqual('fake-id');
        });
    });

    describe('When creating DeleteItemCommandBuilder with a ChatUseCaseInfoAdapter', () => {
        let deleteCommandInput: DeleteItemCommandInput;

        beforeAll(async () => {
            const useCase = new ChatUseCaseInfoAdapter(deleteEvent);
            try {
                deleteCommandInput = await new DeleteItemCommandBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(deleteCommandInput.TableName).toEqual(process.env[USE_CASES_TABLE_NAME_ENV_VAR]);
            expect(deleteCommandInput.Key!.UseCaseId.S).toEqual('11111111-222222222-33333333-44444444-55555555');
        });
    });

    describe('When creating MarkItemForDeletionCommandBuilder with a UseCase', () => {
        let updateItemCommandInput: UpdateItemCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            cfnParameters.set('LLMProviderModelId', 'google/flan-t5-xxl');
            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                deleteEvent.body,
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.stackId = 'fake-stack-id';
            try {
                updateItemCommandInput = await new MarkItemForDeletionCommandBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(updateItemCommandInput.TableName).toEqual(process.env[USE_CASES_TABLE_NAME_ENV_VAR]);
            expect(updateItemCommandInput.Key).toEqual({ 'UseCaseId': { 'S': 'fake-id' } });
            expect(updateItemCommandInput.UpdateExpression).toEqual(
                'SET #TTL = :expiry_time, #DeletedBy = :user, #DeletedDate = :deletion_date'
            );
            expect(updateItemCommandInput.ExpressionAttributeNames).toEqual({
                ['#TTL']: DYNAMODB_TTL_ATTRIBUTE_NAME,
                ['#DeletedBy']: 'DeletedBy',
                ['#DeletedDate']: 'DeletedDate'
            });
        });
    });

    describe('When creating MarkItemForDeletionCommandBuilder with a ChatUseCaseInfoAdapter', () => {
        let updateItemCommandInput: UpdateItemCommandInput;

        beforeAll(async () => {
            const useCase = new ChatUseCaseInfoAdapter(permanentDeleteEvent);
            try {
                updateItemCommandInput = await new MarkItemForDeletionCommandBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(updateItemCommandInput.TableName).toEqual(process.env[USE_CASES_TABLE_NAME_ENV_VAR]);
            expect(updateItemCommandInput.Key).toEqual({
                'UseCaseId': { 'S': '11111111-222222222-33333333-44444444-55555555' }
            });
            expect(updateItemCommandInput.UpdateExpression).toEqual(
                'SET #TTL = :expiry_time, #DeletedBy = :user, #DeletedDate = :deletion_date'
            );
            expect(updateItemCommandInput.ExpressionAttributeNames).toEqual({
                ['#TTL']: DYNAMODB_TTL_ATTRIBUTE_NAME,
                ['#DeletedBy']: 'DeletedBy',
                ['#DeletedDate']: 'DeletedDate'
            });
        });
    });

    describe('When creating ScanCaseTableCommandBuilder with a UseCase', () => {
        let scanCommandInput: ScanCommandInput;

        beforeAll(async () => {
            process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';

            const event = {
                queryStringParameters: {
                    pageSize: '10'
                }
            } as Partial<APIGatewayEvent>;

            try {
                scanCommandInput = await new ScanCaseTableCommandBuilder(
                    new ListUseCasesAdapter(event as APIGatewayEvent)
                ).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(scanCommandInput.TableName).toEqual(process.env[USE_CASES_TABLE_NAME_ENV_VAR]);
            expect(scanCommandInput.Limit).toEqual(DDB_SCAN_RECORDS_LIMIT);
        });
    });

    afterAll(() => {
        delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
    });
});
