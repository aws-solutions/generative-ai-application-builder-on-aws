#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import { PipInstallArguments } from '../framework/bundler/runtime/python';
import {
    GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
    LANGCHAIN_LAMBDA_LAYER_PYTHON_RUNTIME,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME
} from '../utils/constants';

export interface SharedLibLayerProps {
    /**
     * The path to the root directory of the lambda layer.
     */
    readonly entry: string;

    /**
     * The runtimes compatible with the python layer.
     *
     * @default - All runtimes are supported.
     */
    readonly compatibleRuntimes?: lambda.Runtime[];

    /**
     * Path to lock file
     */
    readonly depsLockFilePath?: string;

    /**
     * Description of the lambda layer
     */
    readonly description?: string;

    /**
     * Options for install to be used only by PythonLangchainLayer
     */
    readonly pipOptions?: PipInstallArguments;
}

export class PythonLangchainLayer extends lambda.LayerVersion {
    constructor(scope: Construct, id: string, props: SharedLibLayerProps) {
        const compatibleRuntimes = props.compatibleRuntimes ?? [
            GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
            LANGCHAIN_LAMBDA_PYTHON_RUNTIME
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
                    .assetOptions(LANGCHAIN_LAMBDA_LAYER_PYTHON_RUNTIME)
                    .options(scope, entry, props.pipOptions)
            ),
            compatibleRuntimes,
            description: props.description
        } as lambda.LayerVersionProps);
    }
}
