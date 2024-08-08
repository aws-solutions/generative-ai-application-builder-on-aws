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
        commandList.push(
            `poetry run pip install --python-version ${this.evaluatedPipOptions.pythonVersion} --platform ${this.evaluatedPipOptions.platform} --implementation ${this.evaluatedPipOptions.implementation} --only-binary=${this.evaluatedPipOptions.onlyBinary} -t ${outputDir}/ dist/*.whl`
        );
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
            'python3 -m pip install poetry --upgrade',
            `poetry run pip install --python-version ${this.evaluatedPipOptions.pythonVersion} --platform ${this.evaluatedPipOptions.platform} --implementation ${this.evaluatedPipOptions.implementation} --only-binary=${this.evaluatedPipOptions.onlyBinary} -t ${outputDir}/ dist/*.whl`
        ];
    }
}
