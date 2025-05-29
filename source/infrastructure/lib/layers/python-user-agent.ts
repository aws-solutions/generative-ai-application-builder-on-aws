#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import { LayerProps } from '../utils/common-utils';
import {
    COMMERCIAL_REGION_LAMBDA_LAYER_PYTHON_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME
} from '../utils/constants';

/**
 * A class that defines user-agent layer for Python runtimes
 */
export class PythonUserAgentLayer extends lambda.LayerVersion {
    constructor(scope: Construct, id: string, props: LayerProps) {
        const compatibleRuntimes =
            props.compatibleRuntimes ??
            Array.from(
                new Map(
                    [
                        GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
                        LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
                        COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
                    ].map((value) => [value, value])
                ).values()
            );

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
