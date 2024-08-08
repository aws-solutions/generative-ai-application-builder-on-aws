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
import { COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } from '../../../utils/constants';
import { AdditionalInstallArguments, BundlerAssetOptions } from '../base-asset-options';
import { DockerBuildTemplate, LocalBuildTemplate } from '../base-build-package-template';
import { getLocalBundler } from '../utils/common';

export const DEPENDENCY_EXCLUDES = ['*.pyc'];

/**
 * Python specific class for additional packaging arguments
 */
export class PipInstallArguments implements AdditionalInstallArguments {
    platform?: string;
    implementation?: string;
    pythonVersion?: string;
    onlyBinary?: string;
    requirements?: string;
}

/**
 * A class that knows how to build and package lambda functions with python runtime
 */
export class PythonAssetOptions extends BundlerAssetOptions {
    /**
     * An implementation of Docker build template for Javascript runtime
     */
    protected dockerBuild: DockerBuildTemplate;

    /**
     * An implementation of Local build template for Javascript runtime
     */
    protected localBuild: LocalBuildTemplate;

    public constructor() {
        super();
        this.initializeOptions();
    }

    /**
     * Method to initialize the build templates for JS builds
     */
    protected initializeOptions() {
        this.dockerBuild = new PythonDockerBuild();
        this.localBuild = new PythonLocalBuild();
    }

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
        return {
            ...(assetHash && { assetHash: assetHash, assetHashType: cdk.AssetHashType.CUSTOM }),
            bundling: {
                image: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.bundlingImage,
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

/**
 * Python runtime build implementation of the docker build template for lambda functions
 */
export class PythonDockerBuild extends DockerBuildTemplate {
    /**
     * For python pre-build steps include creating the output directory and deleting any virtual environments created
     *
     * @param outputDir
     * @returns
     */
    protected preBuild(moduleName: string, outputDir: string): string[] {
        return [
            `echo "local bundling failed for ${moduleName} and hence building with Docker image"`,
            'rm -fr .venv*',
            'rm -fr dist',
            'rm -fr .coverage',
            'rm -fr coverage',
            'python3 -m pip install poetry --upgrade'
        ];
    }

    /**
     * For python build steps include copying the artifacts into the output directory and installing module
     * dependencies
     *
     * @param outputDir
     * @returns
     */
    protected build(moduleName: string, outputDir: string): string[] {
        return ['python3 -m pip install poetry --upgrade', 'poetry build', 'poetry install --only main'];
    }

    /**
     * Unit test steps to
     *
     * @param outputDir
     * @returns
     */
    protected unitTest(moduleName: string, outputDir: string): string[] {
        return getUnitTestSteps();
    }

    /**
     * Copying assets
     *
     * @param moduleName
     * @param outputDir
     * @param construct
     * @returns
     */
    protected postBuild(moduleName: string, outputDir: string): string[] {
        const commandList: string[] = [];
        if (process.env.SKIP_PRE_BUILD?.toLowerCase() === 'true') {
            commandList.push('python3 -m pip install poetry --upgrade');
        }
        commandList.push(
            ...[`cp -au /asset-input/* ${outputDir}/`, `poetry run pip install -t ${outputDir} dist/*.whl`]
        );
        return commandList;
    }

    /**
     * As post-build cleanup, remove anything that is not required for packaging.
     *
     * @param outputDir
     * @returns
     */
    protected cleanup(moduleName: string, outputDir: string): string[] {
        return [`find ${outputDir} | grep -E "(/__pycache__$|\.pyc$|\.pyo$|\.coverage$)" | xargs rm -rf`];
    }
}

/**
 * Python local build template
 */
export class PythonLocalBuild extends LocalBuildTemplate {
    /**
     * Pre-build steps for local build template
     *
     * @param outputDir
     * @returns
     */
    protected preBuild(moduleName: string, outputDir: string): string[] {
        return [
            `echo local bundling ${moduleName}`,
            `cd ${moduleName}`,
            'rm -fr .venv*',
            'rm -fr dist',
            'rm -fr coverage',
            'rm -fr .coverage',
            'python3 -m venv .venv',
            '. .venv/bin/activate',
            'python3 -m pip install poetry --upgrade'
        ];
    }

    /**
     * For python build steps include copying the artifacts into the output directory and installing module
     * dependencies
     *
     * @param outputDir
     * @returns
     */
    protected build(moduleName: string, outputDir: string): string[] {
        return ['poetry build', 'poetry install --only main'];
    }

    /**
     * Execute statements post build
     *
     * @param moduleName
     * @param outputDir
     * @param construct
     * @returns
     */
    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [
            `cd ${moduleName}`,
            'python3 -m pip install poetry --upgrade',
            `poetry run pip install -t ${outputDir} dist/*.whl`
        ];
    }

    /**
     * Clean up files and directories post build
     *
     * @param moduleName
     * @param outputDir
     * @returns
     */
    protected cleanup(moduleName: string, outputDir: string): string[] {
        return [
            'deactivate',
            `find ${outputDir} | grep -E "(/__pycache__$|\.pyc$|\.pyo$|.coverage$|dist$|.venv*$)" | xargs rm -rf`,
            `rm -fr ${outputDir}/requirements.txt`
        ];
    }

    /**
     * Execute unit test
     *
     * @param moduleName
     * @param outputDir
     * @returns
     */
    protected unitTest(moduleName: string, outputDir: string): string[] {
        return [`cd ${moduleName}`].concat(getUnitTestSteps());
    }
}

export function getUnitTestSteps(): string[] {
    return [
        'echo "Executing unit tests"',
        'python3 -m venv .venv-test',
        'source .venv-test/bin/activate',
        'pip install poetry',
        'poetry install',
        'poetry run pytest --cov --cov-report=term-missing',
        'deactivate'
    ];
}
