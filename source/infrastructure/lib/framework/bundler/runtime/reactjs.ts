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
