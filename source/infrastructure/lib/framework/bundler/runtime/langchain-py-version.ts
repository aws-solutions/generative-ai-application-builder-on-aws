#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import { IConstruct } from 'constructs';
import * as path from 'path';
import { LANGCHAIN_LAMBDA_PYTHON_RUNTIME } from '../../../utils/constants';
import { AdditionalInstallArguments } from '../base-asset-options';
import { getLocalBundler } from '../utils/common';
import { resolvePipOptions } from './langchain-layer';
import { PipInstallArguments, PythonAssetOptions, PythonDockerBuild, PythonLocalBuild } from './python';

export const DEPENDENCY_EXCLUDES = ['*.pyc'];

/**
 * A class that knows how to build and package lambda functions with python runtime
 */
export class LangchainPythonVersionAssetOptions extends PythonAssetOptions {
    /**
     * An implementation of AssetOptions method to build artifacts.
     *
     * @param assetHash
     * @returns
     */
    public options(
        construct: IConstruct,
        entry: string,
        packagingOptions?: AdditionalInstallArguments,
        assetHash?: string
    ): s3_assets.AssetOptions {
        entry = path.resolve(entry);
        const pipOptions = packagingOptions as PipInstallArguments;
        this.dockerBuild = new LangChainPythonVersionDockerBuild(pipOptions);
        this.localBuild = new LangChainPythonVersionLocalBuild(pipOptions);

        return {
            ...(assetHash && { assetHash: assetHash, assetHashType: cdk.AssetHashType.CUSTOM }),
            bundling: {
                image: LANGCHAIN_LAMBDA_PYTHON_RUNTIME.bundlingImage,
                user: 'root',
                command: this.dockerBuild.bundle(construct, entry, '/asset-output'),
                securityOpt: 'no-new-privileges:true',
                network: 'host',
                local: getLocalBundler(this.localBuild, construct, entry)
            } as cdk.BundlingOptions,
            exclude: DEPENDENCY_EXCLUDES
        } as s3_assets.AssetOptions;
    }
}

export class LangChainPythonVersionDockerBuild extends PythonDockerBuild {
    protected evaluatedPipOptions: PipInstallArguments;

    constructor(installArguments: PipInstallArguments) {
        super();
        this.evaluatedPipOptions = resolvePipOptions(installArguments);
    }

    protected postBuild(moduleName: string, outputDir: string): string[] {
        const commandList: string[] = [];

        if (process.env.SKIP_PRE_BUILD?.toLowerCase() === 'true') {
            commandList.push('python3 -m pip install poetry --upgrade');
        }
        commandList.push('python3 -m pip install poetry-plugin-export --upgrade');
        commandList.push(`poetry export -f requirements.txt --output ${outputDir}/requirements.txt --without-hashes`);
        commandList.push(`poetry run pip install -r ${outputDir}/requirements.txt --python-version ${this.evaluatedPipOptions.pythonVersion} --platform ${this.evaluatedPipOptions.platform} --implementation ${this.evaluatedPipOptions.implementation} --only-binary=${this.evaluatedPipOptions.onlyBinary} -t ${outputDir}/`);
        commandList.push(`poetry run pip install --no-deps -t ${outputDir}/ dist/*.whl`);
        return commandList;
    }
}

export class LangChainPythonVersionLocalBuild extends PythonLocalBuild {
    protected evaluatedPipOptions: PipInstallArguments;

    constructor(installArguments: PipInstallArguments) {
        super();
        this.evaluatedPipOptions = resolvePipOptions(installArguments);
    }

    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [
            `cd ${moduleName}`,
            'python3 -m pip install poetry poetry-plugin-export --upgrade',
            `poetry export -f requirements.txt --output ${outputDir}/requirements.txt --without-hashes`,
            `poetry run pip install -r ${outputDir}/requirements.txt --python-version ${this.evaluatedPipOptions.pythonVersion} --platform ${this.evaluatedPipOptions.platform} --implementation ${this.evaluatedPipOptions.implementation} --only-binary=${this.evaluatedPipOptions.onlyBinary} -t ${outputDir}/`,
            `poetry run pip install --no-deps -t ${outputDir}/ dist/*.whl`
        ];
    }
}
