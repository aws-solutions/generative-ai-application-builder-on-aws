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
import { Construct } from 'constructs';
import { BaseStackProps } from './framework/base-stack';
import { ExternalUseCaseChat } from './framework/external-use-case-stack';
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
export class AnthropicChat extends ExternalUseCaseChat {
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
            handler: 'anthropic_handler.lambda_handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            environment: {
                POWERTOOLS_SERVICE_NAME: 'ANTHROPIC_CHAT'
            },
            memorySize: 256,
            description: 'Lambda serving the websocket based API for Anthropic chat'
        });
        (this.chatLlmProviderLambda.node.defaultChild as lambda.CfnFunction).addMetadata(
            ADDITIONAL_LLM_LIBRARIES,
            [LLM_LIBRARY_LAYER_TYPES.LANGCHAIN_LIB_LAYER, LLM_LIBRARY_LAYER_TYPES.ANTHROPIC_LIB_LAYER].join(',')
        );
    }

    public getLlmProviderName(): CHAT_PROVIDERS {
        return CHAT_PROVIDERS.ANTHROPIC;
    }
}
