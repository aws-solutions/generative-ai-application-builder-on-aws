#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import {
    COMMERCIAL_REGION_LAMBDA_LAYER_PYTHON_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_NODE_TS_LAYER_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME
} from '../utils/constants';
import { SharedLibLayerProps } from './shared-lib';

/**
 * A lambda layer construct for Nodejs aws-sdk libraries
 */
export class AwsNodeSdkLibLayer extends lambda.LayerVersion {
    constructor(scope: Construct, id: string, props: SharedLibLayerProps) {
        const compatibleRuntimes = props.compatibleRuntimes ?? [
            GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME,
            COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME
        ];

        for (const runtime of compatibleRuntimes) {
            if (runtime && runtime.family !== lambda.RuntimeFamily.NODEJS) {
                throw new Error(`Only ${compatibleRuntimes.join(',')} runtimes are supported`);
            }
        }

        const entry = path.resolve(props.entry);

        super(scope, id, {
            code: lambda.Code.fromAsset(
                entry,
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_TS_LAYER_RUNTIME)
                    .options(scope, entry)
            ),
            compatibleRuntimes,
            description: props.description
        } as lambda.LayerVersionProps);
    }
}

/**
 * A lambda layer construct for Python boto3 sdk.
 */
export class Boto3SdkLibLayer extends lambda.LayerVersion {
    constructor(scope: Construct, id: string, props: SharedLibLayerProps) {
        const compatibleRuntimes = props.compatibleRuntimes ?? [
            GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
            LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
            COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
        ];

        for (const runtime of compatibleRuntimes) {
            if (runtime && runtime.family !== lambda.RuntimeFamily.PYTHON) {
                throw new Error(`Only ${compatibleRuntimes.join(',')} runtimes are supported`);
            }
        }

        const entry = path.resolve(props.entry);

        super(scope, id, {
            code: lambda.Code.fromAsset(
                entry,
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_LAYER_PYTHON_RUNTIME)
                    .options(scope, entry)
            ),
            compatibleRuntimes,
            description: props.description
        } as lambda.LayerVersionProps);
    }
}
