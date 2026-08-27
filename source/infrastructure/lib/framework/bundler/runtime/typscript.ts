#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IConstruct } from 'constructs';
import { JavascriptAssetOptions, JavascriptDockerBuild, JavascriptLocalBuild } from './javascript';

/**
 * A class that knows how to build and package lambda function with nodejs runtime
 */
export class TypescriptAssetOptions extends JavascriptAssetOptions {
    /**
     * Method to initialize build templates for TS builds
     */
    protected initializeOptions() {
        this.dockerBuild = new TypescriptDockerBuild();
        this.localBuild = new TypescriptLocalBuild();
    }
}

/**
 * Nodejs docker build template for lambda functions
 */
export class TypescriptDockerBuild extends JavascriptDockerBuild {
    /**
     * Build steps for docker build
     * @param outputDir
     */
    protected build(moduleName: string, outputDir: string): string[] {
        // `npm ci --omit=dev` does not create the node_modules directory when a lambda has no runtime
        // dependencies (e.g. all runtime deps are provided by a shared layer). The trailing `mkdir -p`
        // guarantees node_modules exists so the postBuild copy step does not fail.
        return ['npm install', 'npm run build', 'rm -fr ./node_modules', 'npm ci --omit=dev', 'mkdir -p node_modules'];
    }

    /**
     * Copy assets to output directory post build
     *
     * @param moduleName
     * @param outputDir
     * @param construct
     * @returns
     */
    protected postBuild(moduleName: string, outputDir: string, construct?: IConstruct | undefined): string[] {
        return [
            `mkdir -p ${outputDir}/`,
            `cp -au /asset-input/node_modules ${outputDir}/`,
            `cp -au /asset-input/dist/* ${outputDir}/`
        ];
    }
}

/**
 * Local build template implementation for Nodejs
 */
export class TypescriptLocalBuild extends JavascriptLocalBuild {
    /**
     * build steps for local bundling
     *
     * @param outputDir
     * @returns
     */
    protected build(moduleName: string, outputDir: string): string[] {
        // `npm ci --omit=dev` does not create the node_modules directory when a lambda has no runtime
        // dependencies (e.g. all runtime deps are provided by a shared layer). The trailing `mkdir -p`
        // guarantees node_modules exists so the postBuild copy step does not fail.
        // The local preBuild step `cd`s into moduleName, so these commands run inside the module dir.
        return ['npm install', 'npm run build', 'rm -fr ./node_modules', 'npm ci --omit=dev', 'mkdir -p node_modules'];
    }

    /**
     * Copy assets to output directory post build
     * @param moduleName
     * @param outputDir
     * @param construct
     * @returns
     */
    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [
            `mkdir -p ${outputDir}`,
            `cp -R ${moduleName}/node_modules ${outputDir}/`,
            `cp -R ${moduleName}/dist/* ${outputDir}/` // for local build there is no post build steps.
        ];
    }

    /**
     * pre-build steps for local bundling
     *
     * @param outputDir
     * @returns
     */
    protected preBuild(moduleName: string, outputDir: string): string[] {
        const commandList = super.preBuild(moduleName, outputDir);
        commandList.push('rm -fr dist');
        return commandList;
    }
}
