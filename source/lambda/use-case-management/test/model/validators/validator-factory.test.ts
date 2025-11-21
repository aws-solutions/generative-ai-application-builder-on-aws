// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { StorageManagement } from '../../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../../ddb/use-case-config-management';
import { AgentBuilderUseCaseValidator } from '../../../model/validators/agent-builder-validator';
import { AgentUseCaseValidator } from '../../../model/validators/agent-validator';
import { TextUseCaseValidator } from '../../../model/validators/text-validator';
import { ValidatorFactory } from '../../../model/validators/validator-factory';
import {
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    UseCaseTypes
} from '../../../utils/constants';

describe('ValidatorFactory', () => {
    let ddbMockedClient: any;
    let storageMgmt: StorageManagement;
    let useCaseConfigMgmt: UseCaseConfigManagement;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'model-info-table';
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';

        ddbMockedClient = mockClient(DynamoDBClient);

        storageMgmt = new StorageManagement();
        useCaseConfigMgmt = new UseCaseConfigManagement();
    });

    beforeEach(() => {
        ddbMockedClient.reset();
    });

    afterEach(() => {
        ddbMockedClient.reset();
        jest.clearAllTimers();
    });

    afterAll(async () => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[MODEL_INFO_TABLE_NAME_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];

        try {
            ddbMockedClient.restore();
        } catch (error) {
            // Ignore restore errors
        }

        jest.clearAllMocks();
        jest.clearAllTimers();

        if (global.gc) {
            global.gc();
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    });

    describe('createValidator', () => {
        it('should create TextUseCaseValidator for Chat use case type', () => {
            const validator = ValidatorFactory.createValidator(UseCaseTypes.CHAT, storageMgmt, useCaseConfigMgmt);

            expect(validator).toBeInstanceOf(TextUseCaseValidator);
        });

        it('should create AgentUseCaseValidator for Agent use case type', () => {
            const validator = ValidatorFactory.createValidator(UseCaseTypes.AGENT, storageMgmt, useCaseConfigMgmt);

            expect(validator).toBeInstanceOf(AgentUseCaseValidator);
        });

        it('should create AgentBuilderUseCaseValidator for AgentBuilder use case type', () => {
            const validator = ValidatorFactory.createValidator(
                UseCaseTypes.AGENT_BUILDER,
                storageMgmt,
                useCaseConfigMgmt
            );

            expect(validator).toBeInstanceOf(AgentBuilderUseCaseValidator);
        });

        it('should throw error for invalid use case type', () => {
            expect(() => {
                ValidatorFactory.createValidator('InvalidType', storageMgmt, useCaseConfigMgmt);
            }).toThrow('Invalid use case type: InvalidType');
        });

        it('should throw error for undefined use case type', () => {
            expect(() => {
                ValidatorFactory.createValidator(undefined as any, storageMgmt, useCaseConfigMgmt);
            }).toThrow('Invalid use case type: undefined');
        });

        it('should throw error for null use case type', () => {
            expect(() => {
                ValidatorFactory.createValidator(null as any, storageMgmt, useCaseConfigMgmt);
            }).toThrow('Invalid use case type: null');
        });

        it('should throw error for empty string use case type', () => {
            expect(() => {
                ValidatorFactory.createValidator('', storageMgmt, useCaseConfigMgmt);
            }).toThrow('Invalid use case type: ');
        });
    });

    describe('validator instances', () => {
        it('should create different instances for each call', () => {
            const validator1 = ValidatorFactory.createValidator(UseCaseTypes.CHAT, storageMgmt, useCaseConfigMgmt);
            const validator2 = ValidatorFactory.createValidator(UseCaseTypes.CHAT, storageMgmt, useCaseConfigMgmt);

            expect(validator1).not.toBe(validator2);
            expect(validator1).toBeInstanceOf(TextUseCaseValidator);
            expect(validator2).toBeInstanceOf(TextUseCaseValidator);
        });

        it('should create validators with correct dependencies', () => {
            const validator = ValidatorFactory.createValidator(
                UseCaseTypes.AGENT,
                storageMgmt,
                useCaseConfigMgmt
            ) as AgentUseCaseValidator;

            expect(validator).toBeInstanceOf(AgentUseCaseValidator);
            // Verify that the validator has the correct dependencies injected
            expect((validator as any).storageMgmt).toBe(storageMgmt);
            expect((validator as any).useCaseConfigMgmt).toBe(useCaseConfigMgmt);
        });
    });
});
