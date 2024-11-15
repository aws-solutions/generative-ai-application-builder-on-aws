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

import { IConstruct } from 'constructs';
import path from 'path';
import { TypescriptAssetOptions, TypescriptDockerBuild, TypescriptLocalBuild } from './typscript';

/**
 * A class that knows how to build and package lambda function with nodejs runtime
 */
export class TypescriptLayerAssetOptions extends TypescriptAssetOptions {
    /**
     * Method to initialize build templates for TS builds
     */
    protected initializeOptions() {
        this.dockerBuild = new TypescriptLayerDockerBuild();
        this.localBuild = new TypescriptLayerLocalBuild();
    }
}

/**
 * Nodejs docker build template for lambda functions
 */
export class TypescriptLayerDockerBuild extends TypescriptDockerBuild {
    /**
     * Build steps for docker build
     * @param outputDir
     */
    protected build(moduleName: string, outputDir: string): string[] {
        return [
            `mkdir -p ${outputDir}/nodejs`,
            'npm install',
            'npm run build',
            'rm -fr ./node_modules',
            'npm ci --omit=dev'
        ];
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
        const moduleFolderName = path.basename(moduleName);

        return [
            `mkdir -p ${outputDir}/nodejs`,
            `cp -au /asset-input/node_modules ${outputDir}/nodejs/`,
            `mkdir -p ${outputDir}/nodejs/node_modules/${moduleFolderName}`,
            `cp -au /asset-input/dist/* ${outputDir}/nodejs/node_modules/${moduleFolderName}/`
        ];
    }
}

/**
 * Local build template implementation for Nodejs
 */
export class TypescriptLayerLocalBuild extends TypescriptLocalBuild {
    /**
     * Copy assets to output directory post build
     * @param moduleName
     * @param outputDir
     * @param construct
     * @returns
     */
    protected postBuild(moduleName: string, outputDir: string): string[] {
        const moduleFolderName = path.basename(moduleName);
        return [
            `mkdir -p ${outputDir}/nodejs`,
            `cp -R ${moduleName}/node_modules ${outputDir}/nodejs/`,
            `mkdir -p ${outputDir}/nodejs/node_modules/${moduleFolderName}`,
            `cp -R ${moduleName}/dist/* ${outputDir}/nodejs/node_modules/${moduleFolderName}/` // for local build there is no post build steps.
        ];
    }
}
