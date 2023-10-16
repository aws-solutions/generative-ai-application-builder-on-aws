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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { ChatUseCaseUIAsset } from '../s3web/chat-use-case-ui-asset';
import { DeploymentPlatformUIAsset } from '../s3web/deployment-platform-ui-asset';

export interface UIInfrastructureProps {
    /**
     * Optional: Key of the Web Configuration in Parameter Store containing all the required parameters for the runtime
     * config of the web UI. If not provided, then it will use Fn::ImportValue to import "WebRuntimeConfigKey"
     */
    webRuntimeConfigKey: string;

    /**
     * Custom lambda function to be passed as service token  for the custom infra setup
     */
    customInfra: lambda.Function;

    /**
     * Bucket to store s3 audit logs
     */
    accessLoggingBucket: s3.Bucket;

    /**
     * Folder name for the UI assets to be built
     */
    uiAssetFolder: string;

    /**
     * UUID generated from the parent stack. Required for chat use case.
     */
    useCaseUUID?: string;

    /**
     * Option to deploy UI. If set as `Yes` will deploy the nested stack for UI. Any other value, UI will not
     * deploy
     */
    deployWebApp?: string;
}

/**
 * The core stack that creates the infrastructure required to build the UI site. This construct will only create the
 * WebApp if the CfnMapping for 'Deploy-->WebApp' is set to 'Yes'"
 */
export class UIInfrastructure extends Construct {
    /**
     * condition if the UI stack should be deployed. If 'Yes', then the stack will be deployed.
     * The condition checks the value from CfnMapping.
     */
    public readonly deployWebApp: cdk.CfnCondition;

    /**
     * Nested Stack for WebApp
     */
    public readonly nestedUIStack: cdk.NestedStack;

    constructor(scope: Construct, id: string, props: UIInfrastructureProps) {
        super(scope, id);

        // the construct should be named 'S3UI' as there is a corresponding CDK aspect that uses this name to add resource
        // condition for govcloud
        switch (props.uiAssetFolder) {
            case 'ui-chat': {
                this.nestedUIStack = new ChatUseCaseUIAsset(this, 'S3UI', {
                    parameters: {
                        WebConfigKey: props.webRuntimeConfigKey,
                        CustomResourceLambdaArn: props.customInfra.functionArn,
                        CustomResourceRoleArn: props.customInfra.role!.roleArn,
                        AccessLoggingBucketArn: props.accessLoggingBucket.bucketArn,
                        UseCaseUUID: props.useCaseUUID!
                    },
                    description:
                        'Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution'
                });

                this.deployWebApp = new cdk.CfnCondition(cdk.Stack.of(this), 'DeployWebApp', {
                    expression: cdk.Fn.conditionEquals(props.deployWebApp, 'Yes')
                });

                break;
            }
            case 'ui-deployment': {
                this.nestedUIStack = new DeploymentPlatformUIAsset(this, 'S3UI', {
                    parameters: {
                        WebConfigKey: props.webRuntimeConfigKey,
                        CustomResourceLambdaArn: props.customInfra.functionArn,
                        CustomResourceRoleArn: props.customInfra.role!.roleArn,
                        AccessLoggingBucketArn: props.accessLoggingBucket.bucketArn,
                        UseCaseUUID: props.useCaseUUID!
                    },
                    description:
                        'Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution'
                });

                this.deployWebApp = new cdk.CfnCondition(cdk.Stack.of(this), 'DeployWebApp', {
                    expression: cdk.Fn.conditionEquals(cdk.Fn.findInMap('FeaturesToDeploy', 'Deploy', 'WebApp'), 'Yes')
                });

                break;
            }
            default: {
                throw new Error('Invalid UI asset folder');
            }
        }

        if (this.deployWebApp) {
            (this.nestedUIStack.node.defaultChild as cdk.CfnResource).cfnOptions.condition = this.deployWebApp;
        }
    }
}
