// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { StorageManagement } from '../../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../../ddb/use-case-config-management';
import { AgentUseCaseConfiguration } from '../../../model/types';
import { UseCase } from '../../../model/use-case';
import { AgentUseCaseValidator } from '../../../model/validators/agent-validator';
import {
    AUTHENTICATION_PROVIDERS,
    CfnParameterKeys,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    UseCaseTypes
} from '../../../utils/constants';

describe('AgentUseCaseValidator', () => {
    let validator: AgentUseCaseValidator;
    let ddbMockedClient: any;
    let cognitoMockClient: any;
    let cfnParameters: Map<string, string>;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';

        ddbMockedClient = mockClient(DynamoDBClient);
        cognitoMockClient = mockClient(CognitoIdentityProviderClient);

        const storageMgmt = new StorageManagement();
        const useCaseConfigManagement = new UseCaseConfigManagement();
        validator = new AgentUseCaseValidator(storageMgmt, useCaseConfigManagement);

        cfnParameters = new Map<string, string>();
        cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-id');
    });

    beforeEach(() => {
        ddbMockedClient.reset();
        cognitoMockClient.reset();
    });

    afterEach(() => {
        ddbMockedClient.reset();
        cognitoMockClient.reset();
        jest.clearAllTimers();
    });

    afterAll(async () => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];

        try {
            ddbMockedClient.restore();
            cognitoMockClient.restore();
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

    describe('validateNewUseCase', () => {
        it('should validate a new agent use case successfully', async () => {
            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                new Map<string, string>([
                    [CfnParameterKeys.BedrockAgentId, 'fake-agent-id'],
                    [CfnParameterKeys.BedrockAgentAliasId, 'fake-alias-id']
                ]),
                {
                    UseCaseType: 'Agent',
                    UseCaseName: 'fake-name',
                    AgentParams: {
                        BedrockAgentParams: {
                            AgentId: 'fake-agent-id',
                            AgentAliasId: 'fake-alias-id',
                            EnableTrace: true
                        }
                    }
                } as AgentUseCaseConfiguration,
                'fake-user-id',
                'FakeProviderName',
                'Agent'
            );

            const result = await validator.validateNewUseCase(mockUseCase);
            expect(result).toEqual(mockUseCase);
        });

        it('should validate a new agent use case with Cognito parameters', async () => {
            cognitoMockClient.on(DescribeUserPoolCommand).resolves({
                UserPool: {
                    Id: 'fake-client-id',
                    Domain: 'fake-domain'
                }
            });

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                new Map<string, string>([
                    [CfnParameterKeys.BedrockAgentId, 'fake-agent-id'],
                    [CfnParameterKeys.BedrockAgentAliasId, 'fake-alias-id'],
                    [CfnParameterKeys.ExistingCognitoUserPoolId, 'fake-user-pool-id'],
                    [CfnParameterKeys.ExistingCognitoUserPoolClient, 'fake-client-id']
                ]),
                {
                    UseCaseType: 'Agent',
                    UseCaseName: 'fake-name',
                    AgentParams: {
                        BedrockAgentParams: {
                            AgentId: 'fake-agent-id',
                            AgentAliasId: 'fake-alias-id',
                            EnableTrace: true
                        }
                    },
                    AuthenticationParams: {
                        CognitoParams: {
                            ExistingUserPoolId: 'fake-user-pool-id',
                            ExistingUserPoolClientId: 'fake-client-id'
                        },
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO
                    }
                } as AgentUseCaseConfiguration,
                'fake-user-id',
                'FakeProviderName',
                'Agent'
            );

            const result = await validator.validateNewUseCase(mockUseCase);
            expect(result).toEqual(mockUseCase);
        });

        it('should have the right agent params configuration', async () => {
            const config = {
                UseCaseType: UseCaseTypes.AGENT,
                UseCaseName: 'fake-use-case',
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: '1111122222',
                        AgentAliasId: 'TSTALIASID',
                        EnableTrace: true
                    }
                }
            } as AgentUseCaseConfiguration;

            const testUseCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                config,
                'test-user',
                'FakeProviderName',
                'Agent'
            );

            const validatedUseCase = await validator.validateNewUseCase(testUseCase);

            const validatedConfig = validatedUseCase.configuration as AgentUseCaseConfiguration;

            expect(validatedConfig).toBeDefined();
            expect(validatedConfig.AgentParams).toEqual({
                BedrockAgentParams: {
                    AgentId: '1111122222',
                    AgentAliasId: 'TSTALIASID',
                    'EnableTrace': true
                }
            });
            expect(validatedConfig.UseCaseType).toEqual(UseCaseTypes.AGENT);
            expect(validatedConfig.UseCaseName).toEqual('fake-use-case');
        });
    });

    describe('validateUpdateUseCase', () => {
        beforeEach(() => {
            const config = {
                UseCaseType: UseCaseTypes.AGENT,
                UseCaseName: 'fake-use-case',
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'fake-agent-id',
                        AgentAliasId: 'fake-alias-id',
                        EnableTrace: true
                    }
                }
            };

            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                })
                .resolves({
                    Item: marshall({ config: config })
                });
        });

        it('should validate an update to an agent use case successfully', async () => {
            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                new Map<string, string>([
                    [CfnParameterKeys.BedrockAgentId, 'updated-agent-id'],
                    [CfnParameterKeys.BedrockAgentAliasId, 'updated-alias-id']
                ]),
                {
                    UseCaseType: 'Agent',
                    UseCaseName: 'fake-name',
                    AgentParams: {
                        BedrockAgentParams: {
                            AgentId: 'updated-agent-id',
                            AgentAliasId: 'updated-alias-id',
                            EnableTrace: false
                        }
                    }
                } as AgentUseCaseConfiguration,
                'fake-user-id',
                'FakeProviderName',
                'Agent'
            );

            const result = await validator.validateUpdateUseCase(mockUseCase, 'old-key');
            expect(result).toEqual(mockUseCase);
        });
    });
});
