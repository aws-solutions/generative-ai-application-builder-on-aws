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
import { ApplicationAssetBundler } from './framework/bundler/asset-options-factory';
import {
    PYTHON_PIP_BUILD_PLATFORM,
    PYTHON_PIP_WHEEL_IMPLEMENTATION,
    PYTHON_VERSION
} from './framework/bundler/constants';
import { TextUseCase } from './framework/text-use-case-stack';
import { createDefaultLambdaRole } from './utils/common-utils';
import {
    ADDITIONAL_LLM_LIBRARIES,
    CHAT_LAMBDA_PYTHON_RUNTIME,
    CHAT_PROVIDERS,
    LAMBDA_TIMEOUT_MINS,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
    LLM_LIBRARY_LAYER_TYPES,
    USE_CASE_CONFIG_RECORD_KEY_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
} from './utils/constants';
import { VPCSetup } from './vpc/vpc-setup';

/**
 * The main stack creating the chat use case infrastructure
 */
export class BedrockChat extends TextUseCase {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
        this.withAdditionalResourceSetup(props);
        this.withAnonymousMetrics(props);
    }

    protected withAdditionalResourceSetup(props: BaseStackProps): void {
        super.withAdditionalResourceSetup(props);
        this.setLlmProviderPermissions();
    }

    protected setupVPC(): VPCSetup {
        return new VPCSetup(this, 'VPC', {
            stackType: 'bedrock-use-case',
            deployVpcCondition: this.deployVpcCondition,
            ragEnabled: this.stackParameters.ragEnabled.valueAsString,
            knowledgeBaseType: this.stackParameters.knowledgeBaseType.valueAsString,
            customResourceLambdaArn: this.applicationSetup.customResourceLambda.functionArn,
            customResourceRoleArn: this.applicationSetup.customResourceLambda.role!.roleArn,
            iPamPoolId: this.iPamPoolId.valueAsString,
            accessLogBucket: this.applicationSetup.accessLoggingBucket,
            ...this.baseStackProps
        });
    }

    /**
     * Provisions the llm provider lambda, and sets it to member variable chatLlmProviderLambda
     */
    public llmProviderSetup(): void {
        // the log retention custom resource is setup in the use-case-stack.ts
        const lambdaRole = createDefaultLambdaRole(this, 'ChatLlmProviderLambdaRole', this.deployVpcCondition);
        this.chatLlmProviderLambda = new lambda.Function(this, 'ChatLlmProviderLambda', {
            code: lambda.Code.fromAsset(
                '../lambda/chat',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(CHAT_LAMBDA_PYTHON_RUNTIME)
                    .options(this, '../lambda/chat', {
                        platform: PYTHON_PIP_BUILD_PLATFORM,
                        pythonVersion: PYTHON_VERSION,
                        implementation: PYTHON_PIP_WHEEL_IMPLEMENTATION
                    })
            ),
            role: lambdaRole,
            runtime: LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
            handler: 'bedrock_handler.lambda_handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            memorySize: 256,
            environment: {
                POWERTOOLS_SERVICE_NAME: 'BEDROCK_CHAT'
            },
            description: 'Lambda serving the websocket based API for Bedrock chat'
        });

        const cfnFunction = this.chatLlmProviderLambda.node.defaultChild as lambda.CfnFunction;

        cfnFunction.addMetadata(
            ADDITIONAL_LLM_LIBRARIES,
            [LLM_LIBRARY_LAYER_TYPES.LANGCHAIN_LIB_LAYER, LLM_LIBRARY_LAYER_TYPES.BOTO3_LIB_LAYER].join(',')
        );

        this.withInferenceProfileSetup();
        this.chatLlmProviderLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}::foundation-model/*`,
                    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:provisioned-model/*`
                ]
            })
        );

        this.chatLlmProviderLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['bedrock:ApplyGuardrail'],
                resources: [`arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:guardrail/*`]
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
                        'Resource::arn:<AWS::Partition>:bedrock:<AWS::Region>:<AWS::AccountId>:guardrail/*',
                        'Resource::arn:<AWS::Partition>:bedrock:<AWS::Region>:<AWS::AccountId>:provisioned-model/*',
                        'Resource::*'
                    ]
                }
            ]
        );
    }

    protected withInferenceProfileSetup(): cdk.CustomResource {
        const useInferenceProfile = new cdk.CfnParameter(cdk.Stack.of(this), 'UseInferenceProfile', {
            type: 'String',
            allowedValues: ['Yes', 'No'],
            default: 'No',
            description:
                'If the model configured is Bedrock, you can indicate if you are using Bedrock Inference Profile. This will ensure that the required IAM policies will be configured during stack deployment. For more details refer the following https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html'
        });

        const existingParameterGroups =
            this.templateOptions.metadata !== undefined &&
            Object.hasOwn(this.templateOptions.metadata, 'AWS::CloudFormation::Interface') &&
            this.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? this.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.unshift({
            Label: { default: 'Inference Profile' },
            Parameters: [useInferenceProfile.logicalId]
        });

        const inferenceProfileProvidedCondition = new cdk.CfnCondition(this, 'InferenceProfileProvidedCondition', {
            expression: cdk.Fn.conditionEquals(useInferenceProfile.valueAsString, 'Yes')
        });

        const customResourceUseCaseTablePolicy = new iam.PolicyStatement({
            actions: ['dynamodb:GetItem'],
            resources: [
                `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${this.stackParameters.useCaseConfigTableName.valueAsString}`
            ],
            conditions: {
                'ForAllValues:StringEquals': {
                    'dynamodb:LeadingKeys': [this.stackParameters.useCaseConfigRecordKey.valueAsString]
                }
            },
            effect: iam.Effect.ALLOW
        });

        const getInferenceProfilePolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['bedrock:GetInferenceProfile'],
            resources: [`arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-profile/*`]
        });

        this.applicationSetup.customResourceRole.addToPolicy(getInferenceProfilePolicy);
        this.applicationSetup.customResourceRole.addToPolicy(customResourceUseCaseTablePolicy);

        const inferenceProfileArnsForPolicy = new cdk.CustomResource(this, 'GetModelResourceArns', {
            resourceType: 'Custom::GetModelResourceArns',
            serviceToken: this.applicationSetup.customResourceLambda.functionArn,
            properties: {
                Resource: 'GET_MODEL_RESOURCE_ARNS',
                [USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]: this.stackParameters.useCaseConfigTableName.valueAsString,
                [USE_CASE_CONFIG_RECORD_KEY_ENV_VAR]: this.stackParameters.useCaseConfigRecordKey.valueAsString
            }
        });

        const bedrockUseInferenceProfilePolicy = new iam.Policy(this, 'BedrockInferenceProfilePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['bedrock:InvokeModelWithResponseStream', 'bedrock:InvokeModel'],
                    resources: cdk.Fn.split(',', inferenceProfileArnsForPolicy.getAttString('Arns'))
                })
            ]
        });

        const lambdaRole = this.chatLlmProviderLambda.role!;

        lambdaRole.attachInlinePolicy(bedrockUseInferenceProfilePolicy);
        (bedrockUseInferenceProfilePolicy.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            inferenceProfileProvidedCondition;
        (inferenceProfileArnsForPolicy.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            inferenceProfileProvidedCondition;
        inferenceProfileArnsForPolicy.node.addDependency(lambdaRole);

        NagSuppressions.addResourceSuppressions(
            this.applicationSetup.customResourceRole.node.tryFindChild('DefaultPolicy') as iam.Policy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The inference profile is based on region and model. Hence it cannot be narrowed further',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:bedrock:<AWS::Region>:<AWS::AccountId>:inference-profile/*'
                    ]
                }
            ]
        );

        return inferenceProfileArnsForPolicy;
    }

    public getLlmProviderName(): CHAT_PROVIDERS {
        return CHAT_PROVIDERS.BEDROCK;
    }
}
