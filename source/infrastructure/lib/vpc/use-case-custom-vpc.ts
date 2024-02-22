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

import { Construct } from 'constructs';
import { DEFAULT_RAG_ENABLED_STATUS } from '../utils/constants';
import { CustomVPC, CustomVPCProps } from './custom-vpc';

/**
 * VPC use case deployment
 */
export class UseCaseVPC extends CustomVPC {
    constructor(scope: Construct, id: string, props: CustomVPCProps) {
        super(scope, id, props);

        const stack = cdk.Stack.of(this);

        const ragEnabled = new cdk.CfnParameter(stack, 'RAGEnabled', {
            type: 'String',
            allowedValues: ['true', 'false'],
            default: DEFAULT_RAG_ENABLED_STATUS,
            description:
                'If set to "true", the deployed use case stack will use the provided/created Kendra index to provide RAG functionality. If set to false, the user interacts directly with the LLM.'
        });

        // enabling or disabling RAG
        const ragEnabledCondition = new cdk.CfnCondition(this, 'RAGEnabledCondition', {
            expression: cdk.Fn.conditionEquals(ragEnabled, 'true')
        });

        const kendraEndpoint = new ec2.InterfaceVpcEndpoint(this, 'KendraEndpoint', {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.KENDRA,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });

        kendraEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: [
                    'kendra:Query',
                    'kendra:Retrieve',
                    'kendra:SubmitFeedback',
                    'kendra:CreateIndex',
                    'kendra:DeleteIndex',
                    'kendra:DescribeIndex',
                    'kendra:ListTagsForResource',
                    'kendra:TagResource',
                    'kendra:UpdateIndex'
                ],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [`arn:${cdk.Aws.PARTITION}:kendra:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:index/*`]
            })
        );

        (kendraEndpoint.node.defaultChild as ec2.CfnVPCEndpoint).cfnOptions.condition = ragEnabledCondition;
    }

    /**
     * Returns the stack type that the VPC is being used in. This could be use-case, deployment
     */
    public getStackType(): string {
        throw new Error('Child classes should implement this method. This class should not be instantiated');
    }
}
