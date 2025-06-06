// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
import { UseCase } from '../../model/use-case';
import {
    CfnParameterKeys,
    DDB_SCAN_RECORDS_LIMIT,
    DYNAMODB_TTL_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR
} from '../../utils/constants';
import {
    createUseCaseEvent,
    deleteUseCaseEvent,
    permanentlyDeleteUseCaseEvent,
    updateUseCaseEvent
} from '../event-test-data';
import { ChatUseCaseInfoAdapter } from '../../model/chat-use-case-adapter';

describe('When creating StackCommandBuilders', () => {
    let createEvent: any;
    let updateEvent: any;
    let deleteEvent: any;
    let permanentDeleteEvent: any;

    beforeAll(() => {
        process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';

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
            cfnParameters.set(CfnParameterKeys.DefaultUserEmail, 'fake-email');
            cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-record-key');
            const useCase = new UseCase(
                '11111111-fake-id',
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
            expect(putItemCommandBuilder.Item!.UseCaseConfigRecordKey.S).toEqual('fake-record-key');
        });
    });

    describe('When creating UpdateItemCommandBuilder with a UseCase', () => {
        let updateItemCommandInput: UpdateItemCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set(CfnParameterKeys.DefaultUserEmail, 'fake-email');
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
                'SET #Description = :description, #UpdatedDate = :date, #UpdatedBy = :user, #UseCaseConfigRecordKey = :dynamo_db_record_key'
            );
            expect(updateItemCommandInput.ExpressionAttributeNames).toEqual({
                '#Description': 'Description',
                '#UseCaseConfigRecordKey': 'UseCaseConfigRecordKey',
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
            expect(deleteCommandInput.Key!.UseCaseId.S).toEqual('11111111-2222-2222-3333-333344444444');
        });
    });

    describe('When creating MarkItemForDeletionCommandBuilder with a UseCase', () => {
        let updateItemCommandInput: UpdateItemCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set(CfnParameterKeys.DefaultUserEmail, 'fake-email');
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
                'UseCaseId': { 'S': '11111111-2222-2222-3333-333344444444' }
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
                    pageNumber: '1'
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
