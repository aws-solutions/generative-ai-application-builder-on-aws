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

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
    DEFAULT_KNOWLEDGE_BASE_TYPE,
    DEFAULT_RAG_ENABLED_STATUS,
    KNOWLEDGE_BASE_TYPES,
    SUPPORTED_KNOWLEDGE_BASE_TYPES
} from '../utils/constants';
import { CustomVPC, CustomVPCProps } from './custom-vpc';

/**
 * VPC use case deployment
 */
export class TextUseCaseVPC extends CustomVPC {
    /**
     * condition determining if we need access to the bedrock agents runtime service, for access to knowledge bases
     */
    public readonly bedrockRagEnabledCondition: cdk.CfnCondition;

    /**
     * condition determining if we need access to the kendra service
     */
    public readonly kendraRagEnabledCondition: cdk.CfnCondition;

    constructor(scope: Construct, id: string, props: CustomVPCProps) {
        super(scope, id, props);

        const stack = cdk.Stack.of(this);

        const ragEnabled = new cdk.CfnParameter(stack, 'RAGEnabled', {
            type: 'String',
            allowedValues: ['true', 'false'],
            default: DEFAULT_RAG_ENABLED_STATUS,
            description:
                'If set to "true", the deployed use case stack will use the specified knowledge base to provide RAG functionality. If set to false, the user interacts directly with the LLM.'
        });

        const knowledgeBaseType = new cdk.CfnParameter(stack, 'KnowledgeBaseType', {
            type: 'String',
            allowedValues: SUPPORTED_KNOWLEDGE_BASE_TYPES,
            default: DEFAULT_KNOWLEDGE_BASE_TYPE,
            description: 'Knowledge base type to be used for RAG. Should only be set if RAGEnabled is true'
        });

        // enabling or disabling RAG
        const ragEnabledCondition = new cdk.CfnCondition(this, 'RAGEnabledCondition', {
            expression: cdk.Fn.conditionEquals(ragEnabled, 'true')
        });

        this.kendraRagEnabledCondition = new cdk.CfnCondition(this, 'KendraRAGEnabledCondition', {
            expression: cdk.Fn.conditionAnd(
                ragEnabledCondition,
                cdk.Fn.conditionEquals(knowledgeBaseType.valueAsString, KNOWLEDGE_BASE_TYPES.KENDRA)
            )
        });

        this.bedrockRagEnabledCondition = new cdk.CfnCondition(this, 'BedrockRAGEnabledCondition', {
            expression: cdk.Fn.conditionAnd(
                ragEnabledCondition,
                cdk.Fn.conditionEquals(knowledgeBaseType.valueAsString, KNOWLEDGE_BASE_TYPES.BEDROCK)
            )
        });
    }

    protected getCompatibleAzs(): string[] {
        const bedrockAgentRuntimeServiceName = cdk.Fn.conditionIf(
            this.bedrockRagEnabledCondition.logicalId,
            `com.amazonaws.${cdk.Aws.REGION}.bedrock-agent-runtime`,
            cdk.Aws.NO_VALUE
        ).toString();
        const getCompatibleAZsCustomResource = new cdk.CustomResource(this, 'GetCompatibleAZs', {
            resourceType: 'Custom::GetCompatibleAZs',
            serviceToken: this.customResourceLambdaArn,
            properties: {
                Resource: 'GET_COMPATIBLE_AZS',
                REQUIRED_SERVICE_NAMES: cdk.Fn.join(',', [
                    `com.amazonaws.${cdk.Aws.REGION}.lambda`, // useful placeholder for a service which should be in all AZs for a region
                    bedrockAgentRuntimeServiceName
                ]),
                MAX_AZS: 2
            }
        });
        const customResourceLambdaRole = iam.Role.fromRoleArn(
            this,
            'DescribeVpcEndpointServicesCustomResourceRole',
            this.customResourceLambdaRoleArn
        );

        const describeVpcEndpointServicesPolicy = new iam.Policy(this, 'DescribeVpcEndpointServicesPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ec2:DescribeVpcEndpointServices'],
                    resources: ['*']
                })
            ]
        });
        describeVpcEndpointServicesPolicy.attachToRole(customResourceLambdaRole);
        getCompatibleAZsCustomResource.node.addDependency(describeVpcEndpointServicesPolicy);

        // cfnag suppressions
        NagSuppressions.addResourceSuppressions(describeVpcEndpointServicesPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Must specify * for the specified action',
                appliesTo: ['Resource::*']
            }
        ]);

        // gets returned as comma separated string, so we parse into a string[]
        return cdk.Fn.split(',', getCompatibleAZsCustomResource.getAttString('CompatibleAZs'), 2);
    }

    protected createServiceEndpoints(): void {
        super.createServiceEndpoints();
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

        (kendraEndpoint.node.defaultChild as ec2.CfnVPCEndpoint).cfnOptions.condition = this.kendraRagEnabledCondition;

        const bedrockKnowledgeBaseEndpoint = new ec2.InterfaceVpcEndpoint(this, 'BedrockKnowledgeBaseEndpoint', {
            vpc: this.vpc,
            service: new ec2.InterfaceVpcEndpointService(`com.amazonaws.${cdk.Aws.REGION}.bedrock-agent-runtime`),
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });

        bedrockKnowledgeBaseEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['bedrock:Retrieve'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [`arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:knowledge-base/*`]
            })
        );

        (bedrockKnowledgeBaseEndpoint.node.defaultChild as ec2.CfnVPCEndpoint).cfnOptions.condition =
            this.bedrockRagEnabledCondition;
    }
    /**
     * Returns the stack type that the VPC is being used in. This could be use-case, deployment
     */
    public getStackType(): string {
        throw new Error('Child classes should implement this method. This class should not be instantiated');
    }
}
