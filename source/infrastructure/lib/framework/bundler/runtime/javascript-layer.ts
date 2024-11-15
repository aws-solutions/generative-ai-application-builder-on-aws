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
