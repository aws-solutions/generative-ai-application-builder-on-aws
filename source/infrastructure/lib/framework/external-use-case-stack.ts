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
import * as iam from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { LLM_PROVIDER_API_KEY_ENV_VAR, THIRD_PARTY_LEGAL_DISCLAIMER } from '../utils/constants';
import { VPCSetup } from '../vpc/vpc-setup';
import { BaseStackProps } from './base-stack';
import { UseCaseChat } from './use-case-stack';

export class ExternalUseCaseChatParameters {
    /**
     * This application sends data to 3rd party LLM parameters. You must explicitly consent to this in order to deploy the stack.
     */
    public readonly consentToDataLeavingAWS: cdk.CfnParameter;

    /**
     * Name of secret in Secrets Manager holding the API key used by langchain to call the third party LLM provider
     */
    public readonly providerApiKeySecret: cdk.CfnParameter;

    constructor(stack: IConstruct) {
        this.consentToDataLeavingAWS = new cdk.CfnParameter(stack, 'ConsentToDataLeavingAWS', {
            type: 'String',
            allowedValues: ['Yes', 'No'],
            description: `${THIRD_PARTY_LEGAL_DISCLAIMER}. By setting this to Yes, a user agrees to their data leaving AWS in order to be sent to 3rd party LLM providers`,
            default: 'No'
        });

        this.providerApiKeySecret = new cdk.CfnParameter(stack, 'ProviderApiKeySecret', {
            type: 'String',
            allowedPattern: '^[0-9a-fA-F]{8}\\/api-key$',
            maxLength: 16,
            description:
                'Name of secret in Secrets Manager holding the API key used by langchain to call the third party LLM provider'
        });

        // rules defining parameters which are required or forbidden (potentially based on other parameters)
        // prettier-ignore
        new cdk.CfnRule(stack, 'ConsentToDataLeavingAWSRequiredRule', { // NOSONAR - construct instantiation
            assertions: [
                {
                    assert: cdk.Fn.conditionEquals(this.consentToDataLeavingAWS, 'Yes'),
                    assertDescription: 'You must consent to data leaving AWS in order to deploy this stack.'
                }
            ]
        });
    }
}

/**
 * Abstract class containing the generic chat stack resource creation. Providers will implement their own child of this class, implementing llmProviderSetup
 */
export abstract class ExternalUseCaseChat extends UseCaseChat {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
        const externalParams = new ExternalUseCaseChatParameters(cdk.Stack.of(this));

        // connection to the 3rd party API key held in secrets manager
        this.chatLlmProviderLambda.addEnvironment(
            LLM_PROVIDER_API_KEY_ENV_VAR,
            externalParams.providerApiKeySecret.valueAsString
        );
        this.chatLlmProviderLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['secretsmanager:GetSecretValue'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:${externalParams.providerApiKeySecret.valueAsString}-*`
                ]
            })
        );

        NagSuppressions.addResourceSuppressions(
            this.chatLlmProviderLambda.role!.node.tryFindChild('DefaultPolicy') as iam.Policy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The secret created by the custom resource gets some characters appended to the end of the ARN, so wildcard is needed to read the secret.',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:secretsmanager:<AWS::Region>:<AWS::AccountId>:secret:<ProviderApiKeySecret>-*'
                    ]
                }
            ]
        );
    }

    protected setupVPC(): VPCSetup {
        return new VPCSetup(this, 'VPC', {
            stackType: 'external-use-case',
            deployVpcCondition: this.deployVpcCondition,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
            iPamPoolId: this.iPamPoolId.valueAsString
        });
    }
}
