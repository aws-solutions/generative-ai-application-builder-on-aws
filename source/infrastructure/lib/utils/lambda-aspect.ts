#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { PYTHON_PIP_BUILD_PLATFORM } from '../framework/bundler/constants';
import { PipInstallArguments } from '../framework/bundler/runtime/python';
import { PythonUserAgentLayer } from '../layers/python-user-agent';
import { AwsNodeSdkLibLayer, Boto3SdkLibLayer } from '../layers/runtime-libs';
import { PythonLangchainLayer } from '../layers/shared-lib';
import { TSUserAgentLayer } from '../layers/ts-user-agent';
import {
    ADDITIONAL_LLM_LIBRARIES,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    CloudWatchNamespace,
    GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
    LLM_LIBRARY_LAYER_TYPES
} from '../utils/constants';

export interface LambdaAspectProps {
    /**
     * Solution ID associated with the application
     */
    solutionID: string;
    /**
     * Solution version of the application
     */
    solutionVersion: string;
}

/**
 * A collection of aspects to be injected for lambda functions based on their runtime
 */
export class LambdaAspects extends Construct implements cdk.IAspect {
    private nodejsUserAgentLayer: Map<string, lambda.LayerVersion>;
    private awsNodeSdkLibLayer: Map<string, lambda.LayerVersion>;
    private pythonUserAgentLayer: Map<string, lambda.LayerVersion>;
    private pythonLangchainLayer: Map<string, lambda.LayerVersion>;
    private boto3SdkLibLayer: Map<string, lambda.LayerVersion>;
    private customMetricsPolicy: Map<string, iam.Policy>;
    private solutionID: string;
    private solutionVersion: string;

    constructor(scope: Construct, id: string, props: LambdaAspectProps) {
        super(scope, id);
        this.solutionID = props.solutionID;
        this.solutionVersion = props.solutionVersion;
        this.nodejsUserAgentLayer = new Map();
        this.awsNodeSdkLibLayer = new Map();
        this.pythonUserAgentLayer = new Map();
        this.boto3SdkLibLayer = new Map();
        this.pythonLangchainLayer = new Map();
    }

    public visit(node: IConstruct): void {
        const solutionID = this.solutionID;
        const solutionVersion = this.solutionVersion;

        if (node instanceof lambda.Function) {
            this.addCWMetricsPolicy(node);
            if (node.runtime.family === lambda.RuntimeFamily.NODEJS) {
                this.addLayersForNodejsLambda(node, solutionID, solutionVersion);
            } else if (node.runtime.family === lambda.RuntimeFamily.PYTHON) {
                this.addLayersForPythonLambda(node, solutionID, solutionVersion);
            } else {
                throw new Error(`Layer for ${node.runtime.name} currently not supported`);
            }
        }
    }

    /**
     * Method to add policy to put custom metrics to CloudWatch
     *
     * @param lambda
     */
    private addCWMetricsPolicy(lambda: lambda.Function): iam.Policy {
        const stack = cdk.Stack.of(lambda);
        const functionResource = lambda.node.defaultChild as cdk.CfnResource;
        const functionCondition = functionResource?.cfnOptions?.condition;

        if (!this.customMetricsPolicy) {
            this.customMetricsPolicy = new Map();
        }

        // Use the specific condition ID as the map key
        const mapKey = functionCondition ? `${stack.stackId}-${functionCondition.node.id}` : `${stack.stackId}-default`;

        let metricsPolicy = this.customMetricsPolicy.get(mapKey);

        if (metricsPolicy === undefined) {
            // Create unique policy name for each condition type
            const policyName = functionCondition
                ? `CustomMetricsPolicy-${functionCondition.node.id}`
                : 'CustomMetricsPolicy';

            metricsPolicy = new iam.Policy(stack, policyName, {
                statements: [
                    new iam.PolicyStatement({
                        actions: ['cloudwatch:PutMetricData'],
                        effect: iam.Effect.ALLOW,
                        resources: ['*'],
                        conditions: {
                            StringEquals: {
                                'cloudwatch:namespace': [
                                    CloudWatchNamespace.API_GATEWAY,
                                    CloudWatchNamespace.AWS_KENDRA,
                                    CloudWatchNamespace.AWS_COGNITO,
                                    CloudWatchNamespace.LANGCHAIN_LLM,
                                    CloudWatchNamespace.AWS_BEDROCK
                                ]
                            }
                        }
                    })
                ]
            });

            // Apply the specific condition to the policy
            if (functionCondition) {
                const cfnPolicy = metricsPolicy.node.defaultChild as cdk.CfnResource;
                cfnPolicy.cfnOptions.condition = functionCondition;
            }

            this.customMetricsPolicy.set(mapKey, metricsPolicy);

            NagSuppressions.addResourceSuppressions(metricsPolicy, [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'This policy allows put metric data to CloudWatch. The policy is restricted using policy conditions.',
                    appliesTo: ['Resource::*']
                }
            ]);
        }

        metricsPolicy.attachToRole(lambda.role!);
        return metricsPolicy;
    }

    /**
     * Method to add layers for lambdas with python runtimes. This method has an additional check if the
     * lambda function includes LLM libraries, it will not attach boto3 layer to restrict unpacked lambda size
     * during deployment, implying that LLM lambda functions will rely on the AWS Lambda provided Python SDK
     * versions
     *
     * @param node - the lambda Function construct currently visited (in context)
     * @param solutionID
     * @param solutionVersion
     */
    private addLayersForPythonLambda(node: cdk.aws_lambda.Function, solutionID: string, solutionVersion: string) {
        node.addLayers(this.getOrCreatePythonUserAgent(node));
        node.addEnvironment(
            'AWS_SDK_USER_AGENT',
            `{ "user_agent_extra": "AWSSOLUTION/${solutionID}/${solutionVersion}" }`
        );
        console.log(node.node.metadata);
        /**
         * checks if metadata to attach specific LLM libraries is present in the CDK definition of the
         * lambda function. Because of Lambda's size limitation, it is not possible to attach both
         * boto3 and LLM layers. Hence LLM Lambdas will rely on Lambda provided runtime version of
         * Python SDK and will not bundle the boto3 SDK layer unless explicitly requested via the tag
         */
        if (this.checkIfAdditionalLLMLayersRequired(node)) {
            const lambdaMetadata = (node.node.defaultChild as lambda.CfnFunction).cfnOptions.metadata!;
            const additionalLLMLayersList = lambdaMetadata[ADDITIONAL_LLM_LIBRARIES].split(',');
            for (const layer of additionalLLMLayersList) {
                switch (layer) {
                    case LLM_LIBRARY_LAYER_TYPES.LANGCHAIN_LIB_LAYER: {
                        node.addLayers(this.getOrCreateLangchainLayer(node));
                        break;
                    }
                    case LLM_LIBRARY_LAYER_TYPES.BOTO3_LIB_LAYER: {
                        node.addLayers(this.getOrCreateBoto3LibLayer(node));
                        break;
                    }
                    default: {
                        throw new Error('No valid library types provided');
                    }
                }
            }
        } else {
            node.addLayers(this.getOrCreateBoto3LibLayer(node));
        }
    }

    /**
     * Method to add layers for Nodejs lambda
     *
     * @param node - the lambda Function construct currently visited (in context)
     * @param solutionID
     * @param solutionVersion
     */
    private addLayersForNodejsLambda(node: cdk.aws_lambda.Function, solutionID: any, solutionVersion: any) {
        node.addLayers(this.getOrCreateNodeUserAgent(node), this.getOrCreateAwsNodeSdkLibLayer(node));
        node.addEnvironment(
            'AWS_SDK_USER_AGENT',
            `{ "customUserAgent": [["AWSSOLUTION/${solutionID}/${solutionVersion}"]] }`
        );
        node.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1');
    }

    /**
     * @returns Node runtime compatible LayerVersion for user-agent
     */
    private getOrCreateNodeUserAgent(node: Construct): lambda.LayerVersion {
        const stackId = this.getStackIdFromNode(node);
        if (this.nodejsUserAgentLayer.get(stackId) === undefined) {
            this.nodejsUserAgentLayer.set(
                stackId,
                new TSUserAgentLayer(this.getConstructToCreateLayer(node), 'NodeUserAgentLayer', {
                    entry: '../lambda/layers/aws-node-user-agent-config',
                    description: 'This layer configures AWS Node SDK initialization to send user-agent information',
                    compatibleRuntimes: [GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME, COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME]
                })
            );
        }

        return this.nodejsUserAgentLayer.get(stackId)!;
    }

    /**
     * This method checks if the layer definition exists. If not then creates a new one.
     *
     * @returns Python runtime compatible LayerVersion for user-agent
     */
    private getOrCreatePythonUserAgent(node: Construct): lambda.LayerVersion {
        const stackId = this.getStackIdFromNode(node);
        if (this.pythonUserAgentLayer.get(stackId) === undefined) {
            this.pythonUserAgentLayer.set(
                stackId,
                new PythonUserAgentLayer(this.getConstructToCreateLayer(node), 'PythonUserAgentLayer', {
                    entry: '../lambda/layers/custom_boto3_init',
                    description: 'This layer configures AWS Python SDK initialization to send user-agent information',
                    compatibleRuntimes: pythonCompatibleRuntimes
                })
            );
        }

        return this.pythonUserAgentLayer.get(stackId)!;
    }

    /**
     * This method checks if the layer defition exists. If not then creates a new one.
     *
     * @returns Lambda LayerVersion for AWS Node SDK
     */
    private getOrCreateAwsNodeSdkLibLayer(node: Construct): lambda.LayerVersion {
        const stackId = this.getStackIdFromNode(node);
        if (this.awsNodeSdkLibLayer.get(stackId) === undefined) {
            this.awsNodeSdkLibLayer.set(
                stackId,
                new AwsNodeSdkLibLayer(this.getConstructToCreateLayer(node), 'AwsNodeSdkLayer', {
                    entry: '../lambda/layers/aws-sdk-lib',
                    description: 'AWS Javascript SDK v3 to be bundled with lambda functions as a layer',
                    compatibleRuntimes: [GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME, COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME]
                })
            );
        }

        return this.awsNodeSdkLibLayer.get(stackId)!;
    }

    /**
     * This method checks if the layer definition exists. If not then creates a new one.
     *
     * @returns returns a LayerVersion for Boto3 library
     */
    private getOrCreateBoto3LibLayer(node: Construct): lambda.LayerVersion {
        const stackId = this.getStackIdFromNode(node);
        if (this.boto3SdkLibLayer.get(stackId) === undefined) {
            this.boto3SdkLibLayer.set(
                stackId,
                new Boto3SdkLibLayer(this.getConstructToCreateLayer(node), 'Boto3Layer', {
                    entry: '../lambda/layers/aws_boto3',
                    description: 'Boto3 layer to be bundled with python lambda functions',
                    compatibleRuntimes: pythonCompatibleRuntimes
                })
            );
        }

        return this.boto3SdkLibLayer.get(stackId)!;
    }

    /**
     * This method checks if the layer definition exists. If not then creates a new one.
     *
     * @returns Python runtime compatible LayerVersion for LangChain with all its required packages
     */
    private getOrCreateLangchainLayer(node: Construct): lambda.LayerVersion {
        const stackId = this.getStackIdFromNode(node);
        if (this.pythonLangchainLayer.get(stackId) === undefined) {
            const pipInstallArgs = new PipInstallArguments();
            pipInstallArgs.pythonVersion = LANGCHAIN_LAMBDA_PYTHON_RUNTIME.name.replace('python', '');
            pipInstallArgs.platform = PYTHON_PIP_BUILD_PLATFORM;
            this.pythonLangchainLayer.set(
                stackId,
                new PythonLangchainLayer(this.getConstructToCreateLayer(node), 'LangchainLayer', {
                    entry: '../lambda/layers/langchain',
                    description:
                        'This layer configures the LangChain python package to be bundled with python lambda functions',
                    compatibleRuntimes: pythonCompatibleRuntimes,
                    pipOptions: pipInstallArgs
                })
            );
        }

        return this.pythonLangchainLayer.get(stackId)!;
    }

    /**
     * Get the construct of the stack to create the layer. If the construct is nested then get the construct of the parent
     * stack.
     *
     * @param node
     * @returns
     */
    private getConstructToCreateLayer(node: Construct) {
        let construct: Construct;
        if (cdk.Stack.of(node).nested) {
            construct = cdk.Stack.of(cdk.Stack.of(node).nestedStackParent!);
        } else {
            construct = cdk.Stack.of(node);
        }
        return construct;
    }

    /**
     * Iterates through the lambda construct metadata (if present) in a lambda function node to check if the
     * 'AttachLangchainLayer' metadata has a value of true or false.
     * @param node lambda function node from template
     */
    private checkIfAdditionalLLMLayersRequired(node: lambda.Function): boolean {
        // using escape hatches as there is no way to check if the metadata is present
        const lambdaMetadata = (node.node.defaultChild as lambda.CfnFunction).cfnOptions.metadata;
        if (lambdaMetadata && lambdaMetadata[ADDITIONAL_LLM_LIBRARIES]) {
            return true;
        }

        return false;
    }

    /**
     * Method to get stack ID from node (Construct object)
     *
     * @param node
     * @returns
     */
    private getStackIdFromNode(node: Construct): string {
        const stackId = cdk.Stack.of(node).nestedStackParent
            ? cdk.Stack.of(node).nestedStackParent!.stackId
            : cdk.Stack.of(node).stackId;

        return stackId;
    }
}

const pythonCompatibleRuntimes = Array.from(
    new Map(
        [
            GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
            LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
            COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
        ].map((value) => [value, value])
    ).values()
);
