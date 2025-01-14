#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JavascriptAssetOptions, JavascriptDockerBuild, JavascriptLocalBuild } from './javascript';

/**
 * A class that knows how to build and package lambda function with nodejs runtime
 */
export class ReactjsAssetOptions extends JavascriptAssetOptions {
    /**
     * Method to initialize build templates for TS builds
     */
    protected initializeOptions() {
        this.dockerBuild = new ReactjsDockerBuild();
        this.localBuild = new ReactjsLocalBuild();
    }
}

/**
 * Nodejs docker build template for lambda functions
 */
export class ReactjsDockerBuild extends JavascriptDockerBuild {
    /**
     * Build steps for docker build
     * @param outputDir
     */
    protected build(moduleName: string, outputDir: string): string[] {
        return [`mkdir -p build/`, 'npm install', 'npm run build'];
    }

    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [`cp -au /asset-input/build/* ${outputDir}/`];
    }
}

/**
 * Local build template implementation for Nodejs
 */
export class ReactjsLocalBuild extends JavascriptLocalBuild {
    /**
     * build steps for local bundling
     *
     * @param outputDir
     * @returns
     */
    protected build(moduleName: string, outputDir: string): string[] {
        return ['mkdir -p build', 'npm install', 'npm run build'];
    }

    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [`cp -R ${moduleName}/build/* ${outputDir}/`];
    }
}
