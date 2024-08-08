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

import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import { IConstruct } from 'constructs';
import { AdditionalInstallArguments } from '../base-asset-options';
import { PYTHON_PIP_BUILD_PLATFORM, PYTHON_PIP_WHEEL_IMPLEMENTATION, PYTHON_VERSION } from '../constants';
import { PipInstallArguments } from './python';
import { PythonLayerAssetOptions, PythonLayerDockerBuild, PythonLayerLocalBuild } from './python-layer';

/**
 * Function to evaluate any pip options, and replace with defaults if attribute is empty
 * @param pipOptions python pip command options received
 * @returns
 */
export function resolvePipOptions(pipOptions?: PipInstallArguments): PipInstallArguments {
    return {
        platform: pipOptions?.platform ?? PYTHON_PIP_BUILD_PLATFORM,
        implementation: pipOptions?.implementation ?? PYTHON_PIP_WHEEL_IMPLEMENTATION,
        pythonVersion: pipOptions?.pythonVersion ?? PYTHON_VERSION,
        onlyBinary: pipOptions?.onlyBinary ?? ':all:',
        requirements: pipOptions?.requirements ?? 'requirements.txt'
    };
}

/**
 * A class that knows how to build and package lambda functions with python runtime
 */
export class LangChainLayerAssetOptions extends PythonLayerAssetOptions {
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
        const pipOptions = packagingOptions as PipInstallArguments;
        // if pipOptions is not provided use default values for platform
        const resolvedPipOptions = resolvePipOptions(pipOptions);
        this.dockerBuild = new LangChainLayerDockerBuild(resolvedPipOptions);
        this.localBuild = new LangChainLayerLocalBuild(resolvedPipOptions);
        return super.options(construct, entry, packagingOptions, assetHash);
    }
}

/**
 * Python runtime build implementation of the docker build template for lambda functions
 */
export class LangChainLayerDockerBuild extends PythonLayerDockerBuild {
    protected evaluatedPipOptions: PipInstallArguments;

    constructor(installArguments: PipInstallArguments) {
        super();
        this.evaluatedPipOptions = resolvePipOptions(installArguments);
    }

    /**
     * Install the dependencies in the output directory
     *
     * @param moduleName
     * @param outputDir
     * @returns
     */
    protected postBuild(moduleName: string, outputDir: string): string[] {
        const commandList: string[] = [];

        if (process.env.SKIP_PRE_BUILD?.toLowerCase() === 'true') {
            commandList.push('python3 -m pip install poetry --upgrade');
        }
        commandList.push(
            `poetry run pip install --python-version ${this.evaluatedPipOptions.pythonVersion} --platform ${this.evaluatedPipOptions.platform} --implementation ${this.evaluatedPipOptions.implementation} --only-binary=${this.evaluatedPipOptions.onlyBinary} -t ${outputDir}/python/ dist/*.whl`
        );
        return commandList;
    }
}

/**
 * Python local build template
 */
export class LangChainLayerLocalBuild extends PythonLayerLocalBuild {
    protected evaluatedPipOptions: PipInstallArguments;

    constructor(installArguments: PipInstallArguments) {
        super();
        this.evaluatedPipOptions = resolvePipOptions(installArguments);
    }

    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [
            `cd ${moduleName}`,
            `python3 -m pip install poetry --upgrade`,
            `poetry run pip install --python-version ${this.evaluatedPipOptions.pythonVersion} --platform ${this.evaluatedPipOptions.platform} --implementation ${this.evaluatedPipOptions.implementation} --only-binary=${this.evaluatedPipOptions.onlyBinary} -t ${outputDir}/python/ dist/*.whl`
        ];
    }
}
