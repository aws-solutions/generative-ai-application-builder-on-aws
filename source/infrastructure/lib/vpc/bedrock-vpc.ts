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

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

import { FirstPartyUseCaseVPC } from './first-party-use-case-vpc';

/**
 * VPC for first party use cases (Bedrock/ Sagemaker) deployment
 */
export class BedrockUseCaseVPC extends FirstPartyUseCaseVPC {
    constructor(scope: any, id: string, props: any) {
        super(scope, id, props);

        const bedrockEndpoint = new ec2.InterfaceVpcEndpoint(this, 'BedrockEndpoint', {
            service: new ec2.InterfaceVpcEndpointAwsService('bedrock-runtime'),
            vpc: this.vpc,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });
        bedrockEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [`arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}::foundation-model/*`]
            })
        );
    }

    /**
     * Returns the stack type that the VPC is being used in. This could be use-case, deployment
     */
    public getStackType(): string {
        return 'bedrock-use-case';
    }
}
