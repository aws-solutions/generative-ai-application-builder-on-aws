#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PipInstallArguments, PythonAssetOptions, PythonDockerBuild, PythonLocalBuild } from './python';

/**
 * A class that knows how to build and package lambda functions with python runtime
 */
export class PythonLayerAssetOptions extends PythonAssetOptions {
    /**
     * Method to initialize the build templates for JS builds
     */
    protected initializeOptions() {
        this.dockerBuild = new PythonLayerDockerBuild();
        this.localBuild = new PythonLayerLocalBuild();
    }
}

/**
 * Python runtime build implementation of the docker build template for lambda functions
 */
export class PythonLayerDockerBuild extends PythonDockerBuild {
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

        commandList.push(`poetry run pip install -t ${outputDir}/python/ dist/*.whl`);
        return commandList;
    }
}

/**
 * Python local build template
 */
export class PythonLayerLocalBuild extends PythonLocalBuild {
    protected evaluatedPipOptions: PipInstallArguments;

    constructor() {
        super();
    }

    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [`cd ${moduleName}`, `poetry run pip install -t ${outputDir}/python/ dist/*.whl`];
    }
}
