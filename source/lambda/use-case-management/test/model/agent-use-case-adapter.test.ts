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
