#!/usr/bin/env node

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

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
import { CustomVPCProps } from './custom-vpc';
import { UseCaseVPC } from './use-case-custom-vpc';

/**
 * VPC for 3rd party use case deployment
 */
export class ExternalUseCaseVPC extends UseCaseVPC {
    constructor(scope: Construct, id: string, props: CustomVPCProps) {
        super(scope, id, props);

        const secretsManagerEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
            vpc: this.vpc,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });

        secretsManagerEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: [
                    'secretsmanager:GetSecretValue',
                    'secretsmanager:CreateSecret',
                    'secretsmanager:DeleteSecret',
                    'secretsmanager:DescribeSecret',
                    'secretsmanager:PutSecretValue'
                ],
                effect: iam.Effect.ALLOW,
                resources: ['*'] // NOSONAR - this is a wildcard because an ARN pattern did not work for GetSecretValue
            })
        );
    }

    /**
     * Returns the stack type that the VPC is being used in. This could be use-case, deployment
     */
    public getStackType(): string {
        return 'third-party-use-case';
    }
}
