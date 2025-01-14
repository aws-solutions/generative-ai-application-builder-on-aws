#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JavascriptAssetOptions, JavascriptDockerBuild, JavascriptLocalBuild } from './javascript';

/**
 * A class that knows how to build and package lambda function with nodejs runtime
 */
export class JavascriptLayerAssetOptions extends JavascriptAssetOptions {
    /**
     * Method to initialize build templates for TS builds
     */
    protected initializeOptions() {
        this.dockerBuild = new JavascriptLayerDockerBuild();
        this.localBuild = new JavascriptLayerLocalBuild();
    }
}

/**
 * Nodejs docker build template for lambda functions
 */
export class JavascriptLayerDockerBuild extends JavascriptDockerBuild {
    /**
     * Copy assets to output directory post build
     *
     * @param moduleName
     * @param outputDir
     * @param construct
     * @returns
     */
    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [
            `mkdir -p ${outputDir}/nodejs/node_modules`,
            `cp -au /asset-input/node_modules/* ${outputDir}/nodejs/node_modules/`
        ];
    }
}

/**
 * Local build template implementation for Nodejs
 */
export class JavascriptLayerLocalBuild extends JavascriptLocalBuild {
    /**
     * Copy assets to output directory post build
     * @param moduleName
     * @param outputDir
     * @param construct
     * @returns
     */
    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [
            `mkdir -p ${outputDir}/nodejs/node_modules`,
            `cp -R ${moduleName}/node_modules/* ${outputDir}/nodejs/node_modules/` // for local build there is no post build steps.
        ];
    }
}
