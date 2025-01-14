// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import { AgentUseCaseDeploymentAdapter } from '../../model/agent-use-case-adapter';
import { IS_INTERNAL_USER_ENV_VAR } from '../../utils/constants';
import {
    createAgentUseCaseApiEvent,
    createAgentUseCaseApiEventWithCognitoConfigEvent,
    createAgentUseCaseWithExistingVpcApiEvent,
    createAgentUseCaseWithVpcApiEvent
} from '../event-test-data';

jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomUUID: jest.fn().mockReturnValue('11111111-222222222-33333333-44444444-55555555')
    };
});

describe('Test AgentUseCaseDeploymentAdapter', () => {
    beforeEach(() => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
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
            IsInternalUser: 'true'
        });
    });

    it('should have the correct cfnParameters', () => {
        let useCase = new AgentUseCaseDeploymentAdapter(createAgentUseCaseApiEvent as any as APIGatewayEvent);
        expect(useCase.cfnParameters!.get('DefaultUserEmail')).toBe('fake-email@example.com');
        expect(useCase.cfnParameters!.get('DeployUI')).toBe('No');
        expect(useCase.cfnParameters!.get('BedrockAgentId')).toBe('fake-agent-id');
        expect(useCase.cfnParameters!.get('BedrockAgentAliasId')).toBe('fake-alias-id');
        expect(useCase.cfnParameters!.get('UseCaseUUID')).toBe('11111111');
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
});

describe('Test AgentUseCaseWithCognitoUserPool', () => {
    beforeEach(() => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
    });

    it('should set the cfn parameters for cognito config', () => {
        let useCase = new AgentUseCaseDeploymentAdapter(
            createAgentUseCaseApiEventWithCognitoConfigEvent as any as APIGatewayEvent
        );
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolId')).toBe('fake-user-pool-id');
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolClient')).toBe('fake-user-pool-client-id');
    });
});
