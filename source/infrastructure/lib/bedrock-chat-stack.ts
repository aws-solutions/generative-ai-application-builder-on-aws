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
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    LAMBDA_TIMEOUT_MINS,
    LLM_LIBRARY_LAYER_TYPES,
    PYTHON_PIP_BUILD_PLATFORM,
    PYTHON_PIP_WHEEL_IMPLEMENTATION,
    PYTHON_VERSION
} from './utils/constants';

/**
 * The main stack creating the chat use case infrastructure
 */
export class BedrockChat extends UseCaseChat {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
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
            role: createDefaultLambdaRole(this, 'ChatLlmProviderLambdaRole'),
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
            handler: 'bedrock_handler.lambda_handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            memorySize: 256,
            environment: {
                POWERTOOLS_SERVICE_NAME: 'BEDROCK_CHAT'
            },
            description: 'Lambda serving the websocket based API for Bedrock chat'
        });
        (this.chatLlmProviderLambda.node.defaultChild as lambda.CfnFunction).addMetadata(
            ADDITIONAL_LLM_LIBRARIES,
            [LLM_LIBRARY_LAYER_TYPES.LANGCHAIN_LIB_LAYER, LLM_LIBRARY_LAYER_TYPES.BOTO3_LIB_LAYER].join(',')
        );

        this.chatLlmProviderLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                resources: [`arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}::foundation-model/*`]
            })
        );

        NagSuppressions.addResourceSuppressions(
            this.chatLlmProviderLambda.role!.node.tryFindChild('DefaultPolicy') as iam.Policy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'This lambda is granted permissions to invoke any bedrock model, which requires the *.',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:bedrock:<AWS::Region>::foundation-model/*',
                        'Resource::*'
                    ]
                }
            ]
        );
    }

    public getLlmProviderName(): CHAT_PROVIDERS {
        return CHAT_PROVIDERS.BEDROCK;
    }
}
