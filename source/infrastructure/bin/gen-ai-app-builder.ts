#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as crypto from 'crypto';
import { BedrockAgent } from '../lib/bedrock-agent-stack';
import { BedrockChat } from '../lib/bedrock-chat-stack';
import { DeploymentPlatformStack } from '../lib/deployment-platform-stack';
import { BaseStack, BaseStackProps } from '../lib/framework/base-stack';
import { SageMakerChat } from '../lib/sagemaker-chat-stack';
import { AppRegistry } from '../lib/utils/app-registry-aspects';
import { LambdaAspects } from '../lib/utils/lambda-aspect';
import { LogGroupRetentionCheckAspect } from '../lib/utils/log-group-retention-check-aspect';

const app = new cdk.App();
const solutionID = process.env.SOLUTION_ID ?? app.node.tryGetContext('solution_id');
const version = process.env.VERSION ?? app.node.tryGetContext('solution_version');
const solutionName = process.env.SOLUTION_NAME ?? app.node.tryGetContext('solution_name');
const applicationType = app.node.tryGetContext('application_type');
const applicationName = app.node.tryGetContext('app_registry_name');
const applicationTrademarkName = app.node.tryGetContext('application_trademark_name');

const stackList: (typeof BaseStack)[] = [BedrockChat, SageMakerChat, BedrockAgent];

for (const stack of stackList) {
    createStack(stack, undefined, true);
}

createStack(DeploymentPlatformStack, getDefaultBaseStackProps(DeploymentPlatformStack), false);

// adding cdk-nag checks
cdk.Aspects.of(app).add(new AwsSolutionsChecks(), { priority: cdk.AspectPriority.READONLY });
cdk.Aspects.of(app).add(new LogGroupRetentionCheckAspect(), { priority: cdk.AspectPriority.READONLY });

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
                ? `${applicationName}-${cdk.Fn.select(0, cdk.Fn.split('-', cdk.Fn.ref('UseCaseUUID')))}`
                : `${applicationName}-Dashboard`
        }),
        { priority: cdk.AspectPriority.MUTATING }
    );

    // adding lambda layer to all lambda functions for injecting user-agent for SDK calls to AWS services.
    cdk.Aspects.of(instance).add(
        new LambdaAspects(instance, 'AspectInject', {
            solutionID: solutionID,
            solutionVersion: version
        }),
        { priority: cdk.AspectPriority.MUTATING }
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
            ? `(${solutionID}) - ${stack.name} - ${solutionName} - ${stack.name} - Version ${version}`
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
