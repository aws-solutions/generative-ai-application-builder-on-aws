// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import { AgentUseCaseDeploymentAdapter, AgentUseCaseInfoAdapter } from '../../../model/adapters/agent-use-case-adapter';
import { IS_INTERNAL_USER_ENV_VAR, STACK_DEPLOYMENT_SOURCE_USE_CASE } from '../../../utils/constants';
import {
    createAgentUseCaseApiEvent,
    createAgentUseCaseApiEventWithCognitoConfigEvent,
    createAgentUseCaseApiEventWithoutCognitoWithApiConfigEvent,
    createAgentUseCaseWithExistingVpcApiEvent,
    createAgentUseCaseWithVpcApiEvent
} from '../../event-test-data';

jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomUUID: jest.fn().mockReturnValue('11111111-2222-2222-3333-333344444444')
    };
});

describe('Test AgentUseCaseDeploymentAdapter', () => {
    beforeEach(() => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-config-table';
        process.env.COGNITO_POLICY_TABLE_NAME = 'test-cognito-table';
        process.env.USER_POOL_ID = 'test-user-pool';
    });

    afterEach(() => {
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env.COGNITO_POLICY_TABLE_NAME;
        delete process.env.USER_POOL_ID;
    });

    it('should be able to be constructed with event body', () => {
        let useCase = new AgentUseCaseDeploymentAdapter(createAgentUseCaseApiEvent as any as APIGatewayEvent);
        expect(useCase.configuration).toEqual({
            UseCaseType: 'Agent',
            UseCaseName: 'fake-name',
            AgentParams: {
                BedrockAgentParams: {
                    AgentId: 'fake-agent-id',
                    AgentAliasId: 'fake-alias-id',
                    EnableTrace: true
                }
            },
            FeedbackParams: {
                FeedbackEnabled: true,
                CustomMappings: {}
            },
            IsInternalUser: 'true',
            ProvisionedConcurrencyValue: 0
        });
    });

    it('should have the correct cfnParameters', () => {
        let useCase = new AgentUseCaseDeploymentAdapter(createAgentUseCaseApiEvent as any as APIGatewayEvent);
        expect(useCase.cfnParameters!.get('DefaultUserEmail')).toBe('fake-email@example.com');
        expect(useCase.cfnParameters!.get('DeployUI')).toBe('No');
        expect(useCase.cfnParameters!.get('BedrockAgentId')).toBe('fake-agent-id');
        expect(useCase.cfnParameters!.get('BedrockAgentAliasId')).toBe('fake-alias-id');
        expect(useCase.cfnParameters!.get('UseCaseUUID')).toBe('11111111-2222-2222-3333-333344444444');
        expect(useCase.cfnParameters!.get('FeedbackEnabled')).toBe('Yes');
        expect(useCase.cfnParameters!.get('ProvisionedConcurrencyValue')).toBe('0');
        expect(useCase.cfnParameters!.get('StackDeploymentSource')).toEqual(STACK_DEPLOYMENT_SOURCE_USE_CASE);
    });

    it('should handle VPC parameters when VPC is enabled and using an existing VPC', () => {
        let useCase = new AgentUseCaseDeploymentAdapter(
            createAgentUseCaseWithExistingVpcApiEvent as any as APIGatewayEvent
        );
        expect(useCase.cfnParameters!.get('VpcEnabled')).toBe('Yes');
        expect(useCase.cfnParameters!.get('CreateNewVpc')).toBe('No');
        expect(useCase.cfnParameters!.get('ExistingVpcId')).toBe('vpc-id');
        expect(useCase.cfnParameters!.get('ExistingPrivateSubnetIds')).toBe('subnet-id-1,subnet-id-2');
        expect(useCase.cfnParameters!.get('ExistingSecurityGroupIds')).toBe('sg-id-1');
    });

    it('should handle VPC parameters when creating new VPC', () => {
        let useCase = new AgentUseCaseDeploymentAdapter(createAgentUseCaseWithVpcApiEvent as any as APIGatewayEvent);
        expect(useCase.cfnParameters!.get('VpcEnabled')).toBe('Yes');
        expect(useCase.cfnParameters!.get('CreateNewVpc')).toBe('Yes');
    });

    it('Should add ExistingApiRootResourceId to jsonBody when apiRootResourceId is provided', () => {
            const apiRootResourceId = 'test-root-resource-id';
            let useCase = new AgentUseCaseDeploymentAdapter(
                createAgentUseCaseApiEvent as any as APIGatewayEvent,
                apiRootResourceId
            );
    
            const originalBody = JSON.parse(createAgentUseCaseApiEvent.body);
            
            expect(useCase.configuration).toEqual({
                'UseCaseType': 'Agent',
                'UseCaseName': 'fake-name',
                'IsInternalUser': 'true',
                'AgentParams': {
                    'BedrockAgentParams': {
                        'AgentId': 'fake-agent-id',
                        'AgentAliasId': 'fake-alias-id',
                        'EnableTrace': true
                    }
                },  
                'FeedbackParams': {
                    'FeedbackEnabled': true,
                    'CustomMappings': {}
                },
                'ProvisionedConcurrencyValue': 0
            });
        });
    
        it('Should not add ExistingApiRootResourceId when apiRootResourceId is not provided', () => {
            let useCase = new AgentUseCaseDeploymentAdapter(createAgentUseCaseApiEvent as any as APIGatewayEvent);
            
            const parsedBody = JSON.parse(createAgentUseCaseApiEvent.body);
            expect(parsedBody.ExistingApiRootResourceId).toBeUndefined();
        });
    
        it('Should handle apiRootResourceId with existing API configuration', () => {
            const apiRootResourceId = 'test-root-resource-id';
            const eventWithExistingApi = {
                ...createAgentUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentUseCaseApiEvent.body),
                    ExistingRestApiId: 'test-api-id'
                })
            };
    
            let useCase = new AgentUseCaseDeploymentAdapter(
                eventWithExistingApi as any as APIGatewayEvent,
                apiRootResourceId
            );
    
            expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('test-api-id');
            expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe(apiRootResourceId);
        });
    
        it('Should set API-related CFN parameters correctly when provided', () => {
            const apiRootResourceId = 'test-root-resource-id';
            const eventWithExistingApi = {
                ...createAgentUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentUseCaseApiEvent.body),
                    ExistingRestApiId: 'test-api-id',
                    AuthenticationParams: undefined // ensure no Cognito user pool to allow API params
                })
            };
    
            let useCase = new AgentUseCaseDeploymentAdapter(
                eventWithExistingApi as any as APIGatewayEvent,
                apiRootResourceId
            );
    
            expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('test-api-id');
            expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe(apiRootResourceId);
        });
});

describe('Test AgentUseCaseWithCognitoUserPool', () => {
    beforeEach(() => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-config-table';
        process.env.COGNITO_POLICY_TABLE_NAME = 'test-cognito-table';
        process.env.USER_POOL_ID = 'test-user-pool';
    });

    afterEach(() => {
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env.COGNITO_POLICY_TABLE_NAME;
        delete process.env.USER_POOL_ID;
    });

    it('should set the cfn parameters for cognito config', () => {
        let useCase = new AgentUseCaseDeploymentAdapter(
            createAgentUseCaseApiEventWithCognitoConfigEvent as any as APIGatewayEvent
        );
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolId')).toBe('fake-user-pool-id');
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolClient')).toBe('fake-user-pool-client-id');
        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBeUndefined();
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBeUndefined();
    });

    it('should set the cfn parameters for api config', () => {
        let useCase = new AgentUseCaseDeploymentAdapter(
            createAgentUseCaseApiEventWithoutCognitoWithApiConfigEvent as any as APIGatewayEvent
        );
        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('fake-api-id');
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe('fake-root-resource-id');
    });

    it('should throw error for unsupported authentication provider', () => {
        const eventWithUnsupportedAuth = {
            ...createAgentUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentUseCaseApiEvent.body),
                AuthenticationParams: {
                    AuthenticationProvider: 'UnsupportedProvider',
                    CognitoParams: {
                        ExistingUserPoolId: 'fake-user-pool-id'
                    }
                }
            })
        };

        expect(() => new AgentUseCaseDeploymentAdapter(eventWithUnsupportedAuth as any as APIGatewayEvent)).toThrow(
            'Error: unsupported AuthenticationProvider: UnsupportedProvider.'
        );
    });

    it('should throw error when ExistingUserPoolId is missing for Cognito provider', () => {
        const eventWithMissingUserPoolId = {
            ...createAgentUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentUseCaseApiEvent.body),
                AuthenticationParams: {
                    AuthenticationProvider: 'Cognito',
                    CognitoParams: {
                        ExistingUserPoolClientId: 'fake-user-pool-client-id'
                    }
                }
            })
        };

        expect(() => new AgentUseCaseDeploymentAdapter(eventWithMissingUserPoolId as any as APIGatewayEvent)).toThrow(
            'Required field existingUserPoolId not provided for the "Cognito" AuthenticationProvider.'
        );
    });

    it('should handle feedback disabled', () => {
        const eventWithFeedbackDisabled = {
            ...createAgentUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentUseCaseApiEvent.body),
                FeedbackParams: {
                    FeedbackEnabled: false
                }
            })
        };

        let useCase = new AgentUseCaseDeploymentAdapter(eventWithFeedbackDisabled as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('FeedbackEnabled')).toBe('No');
        expect(useCase.configuration.FeedbackParams?.FeedbackEnabled).toBe(false);
        expect(useCase.configuration.FeedbackParams?.CustomMappings).toBeUndefined();
    });

    it('should handle trace disabled', () => {
        const eventWithTraceDisabled = {
            ...createAgentUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentUseCaseApiEvent.body),
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'fake-agent-id',
                        AgentAliasId: 'fake-alias-id',
                        EnableTrace: false
                    }
                }
            })
        };

        let useCase = new AgentUseCaseDeploymentAdapter(eventWithTraceDisabled as any as APIGatewayEvent);

        const config = useCase.configuration as import('../../../model/types').AgentUseCaseConfiguration;
        expect(config.AgentParams?.BedrockAgentParams.EnableTrace).toBe(false);
    });
});

describe('Test AgentUseCaseInfoAdapter', () => {
    it('should create AgentUseCaseInfoAdapter with correct properties', () => {
        const mockEvent = {
            pathParameters: {
                useCaseId: 'test-use-case-id'
            },
            requestContext: {
                authorizer: {
                    UserId: 'test-user-id'
                }
            } as any
        } as any as APIGatewayEvent;

        const adapter = new AgentUseCaseInfoAdapter(mockEvent);

        expect(adapter.useCaseType).toBe('Agent');
        expect(adapter.useCaseId).toBe('test-use-case-id');
        expect(adapter.userId).toBe('test-user-id');
        expect(adapter.name).toBe('');
        expect(adapter.description).toBeUndefined();
        expect(adapter.providerName).toBe('');
        expect(adapter.configuration).toEqual({});
    });
});
