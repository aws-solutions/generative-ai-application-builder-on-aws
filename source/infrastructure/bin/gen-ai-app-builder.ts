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
import { AwsSolutionsChecks } from 'cdk-nag';
import * as crypto from 'crypto';
import { AnthropicChat } from '../lib/anthropic-chat-stack';
import { BedrockChat } from '../lib/bedrock-chat-stack';
import { SageMakerChat } from '../lib/sagemaker-chat-stack';
import { DeploymentPlatformStack } from '../lib/deployment-platform-stack';
import { BaseStack, BaseStackProps } from '../lib/framework/base-stack';
import { HuggingFaceChat } from '../lib/hugging-face-chat-stack';
import { AppRegistry } from '../lib/utils/app-registry-aspects';
import { LambdaAspects } from '../lib/utils/lambda-aspect';

const app = new cdk.App();
const solutionID = process.env.SOLUTION_ID ?? app.node.tryGetContext('solution_id');
const version = process.env.VERSION ?? app.node.tryGetContext('solution_version');
const solutionName = process.env.SOLUTION_NAME ?? app.node.tryGetContext('solution_name');
const applicationType = app.node.tryGetContext('application_type');
const applicationName = app.node.tryGetContext('app_registry_name');
const applicationTrademarkName = app.node.tryGetContext('application_trademark_name');

const stackList: (typeof BaseStack)[] = [HuggingFaceChat, AnthropicChat, BedrockChat, SageMakerChat];

for (const stack of stackList) {
    createStack(stack, undefined, true);
}

createStack(DeploymentPlatformStack, getDefaultBaseStackProps(DeploymentPlatformStack), false);

// adding cdk-nag checks
cdk.Aspects.of(app).add(new AwsSolutionsChecks());

app.synth();

/**
 * Method to instantiate a stack
 *
 * @param stack
 * @returns
 */
function createStack(stack: typeof BaseStack, props?: BaseStackProps, isUseCase?: boolean) {
    const instance = new stack(app, stack.name, props ?? getDefaultBaseStackProps(stack, isUseCase));

    cdk.Aspects.of(instance).add(
        new AppRegistry(instance, 'AppRegistry', {
            solutionID: solutionID,
            solutionVersion: version,
            solutionName: solutionName,
            applicationType: applicationType,
            applicationName: isUseCase
                ? `${applicationName}-${cdk.Fn.ref('UseCaseUUID')}`
                : `${applicationName}-Dashboard`
        })
    );

    // adding lambda layer to all lambda functions for injecting user-agent for SDK calls to AWS services.
    cdk.Aspects.of(instance).add(
        new LambdaAspects(instance, 'AspectInject', {
            solutionID: solutionID,
            solutionVersion: version
        })
    );
}

/**
 * Method that returns default  base stack props.
 *
 * @param stack
 * @returns
 */
function getDefaultBaseStackProps(stack: typeof BaseStack, isUseCase?: boolean): BaseStackProps {
    return {
        description: isUseCase
            ? `(${solutionID}-${stack.name}) - ${solutionName} - ${stack.name} - Version ${version}`
            : `(${solutionID}) - ${solutionName} - ${stack.name} - Version ${version}`,
        synthesizer: new cdk.DefaultStackSynthesizer({
            generateBootstrapVersionRule: false
        }),
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: `${solutionName}`,
        applicationTrademarkName: applicationTrademarkName,
        ...(isUseCase && {
            stackName: `${stack.name}-${crypto.randomUUID().substring(0, 8)}`
        })
    } as BaseStackProps;
}
