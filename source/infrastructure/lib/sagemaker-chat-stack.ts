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

import { Construct } from 'constructs';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { BaseStackProps } from './framework/base-stack';
import { UseCaseChat } from './framework/use-case-stack';
import { AppAssetBundler } from './utils/asset-bundling';
import { createDefaultLambdaRole } from './utils/common-utils';
import {
    ADDITIONAL_LLM_LIBRARIES,
    CHAT_PROVIDERS,
    LAMBDA_TIMEOUT_MINS,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
    LLM_LIBRARY_LAYER_TYPES,
    PYTHON_PIP_BUILD_PLATFORM,
    PYTHON_PIP_WHEEL_IMPLEMENTATION,
    PYTHON_VERSION
} from './utils/constants';
import { VPCSetup } from './vpc/vpc-setup';

/**
 * The main stack creating the chat use case infrastructure
 */
export class SageMakerChat extends UseCaseChat {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
    }

    protected setupVPC(): VPCSetup {
        return new VPCSetup(this, 'VPC', {
            stackType: 'sagemaker-use-case',
            deployVpcCondition: this.deployVpcCondition,
            ragEnabled: this.stackParameters.ragEnabled.valueAsString,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
            iPamPoolId: this.iPamPoolId.valueAsString
        });
    }

    /**
     * Provisions the llm provider lambda, and sets it to member variable chatLlmProviderLambda
     */
    public llmProviderSetup(): void {
        this.chatLlmProviderLambda = new lambda.Function(this, 'ChatLlmProviderLambda', {
            code: lambda.Code.fromAsset(
                '../lambda/chat',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions('PythonPlatformSpecific')
                    .options('../lambda/chat', undefined, {
                        platform: PYTHON_PIP_BUILD_PLATFORM,
                        pythonVersion: PYTHON_VERSION,
                        implementation: PYTHON_PIP_WHEEL_IMPLEMENTATION
                    })
            ),
            role: createDefaultLambdaRole(this, 'ChatLlmProviderLambdaRole', this.deployVpcCondition),
            runtime: LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
            handler: 'sagemaker_handler.lambda_handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            memorySize: 256,
            environment: {
                POWERTOOLS_SERVICE_NAME: 'SAGEMAKER_CHAT'
            },
            description: 'Lambda serving the websocket based API for SageMaker chat'
        });

        const cfnFunction = this.chatLlmProviderLambda.node.defaultChild as lambda.CfnFunction;

        cfnFunction.addMetadata(
            ADDITIONAL_LLM_LIBRARIES,
            [LLM_LIBRARY_LAYER_TYPES.LANGCHAIN_LIB_LAYER, LLM_LIBRARY_LAYER_TYPES.BOTO3_LIB_LAYER].join(',')
        );

        this.chatLlmProviderLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['sagemaker:InvokeEndpoint', 'sagemaker:InvokeEndpointWithResponseStream'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:sagemaker:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:endpoint/*`,
                    `arn:${cdk.Aws.PARTITION}:sagemaker:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-component/*`
                ]
            })
        );

        NagSuppressions.addResourceSuppressions(
            this.chatLlmProviderLambda.role!.node.tryFindChild('DefaultPolicy') as iam.Policy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'This lambda is granted permissions to invoke any sagemaker endpoint in their account, which requires the *.',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:sagemaker:<AWS::Region>:<AWS::AccountId>:endpoint/*',
                        'Resource::arn:<AWS::Partition>:sagemaker:<AWS::Region>:<AWS::AccountId>:inference-component/*'
                    ]
                }
            ]
        );
    }

    public getLlmProviderName(): CHAT_PROVIDERS {
        return CHAT_PROVIDERS.SAGEMAKER;
    }
}
