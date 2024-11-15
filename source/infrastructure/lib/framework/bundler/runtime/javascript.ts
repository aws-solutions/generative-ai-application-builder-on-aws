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
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME } from '../../../utils/constants';
import { BundlerAssetOptions } from '../base-asset-options';
import { DockerBuildTemplate, LocalBuildTemplate } from '../base-build-package-template';
import { getLocalBundler } from '../utils/common';

/**
 * A class that knows how to build and package lambda function with nodejs runtime
 */
export class JavascriptAssetOptions extends BundlerAssetOptions {
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
        this.dockerBuild = new JavascriptDockerBuild();
        this.localBuild = new JavascriptLocalBuild();
    }

    public options(construct: IConstruct, entry: string, assetHash?: string): s3_assets.AssetOptions {
        entry = path.resolve(entry);
        return {
            ...(assetHash && { assetHash: assetHash, assetHashType: cdk.AssetHashType.CUSTOM }),
            bundling: {
                image: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.bundlingImage,
                user: 'root',
                command: this.dockerBuild.bundle(construct, entry, '/asset-output'),
                securityOpt: 'no-new-privileges:true',
                network: 'host',
                local: getLocalBundler(this.localBuild, construct, entry)
            } as cdk.BundlingOptions
        } as s3_assets.AssetOptions;
    }
}

/**
 * Nodejs docker build template for lambda functions
 */
export class JavascriptDockerBuild extends DockerBuildTemplate {
    /**
     * pre-build steps for Nodejs docker build
     */
    protected preBuild(moduleName: string, outputDir: string): string[] {
        return [
            `echo \"local bundling failed for ${moduleName} and hence building with Docker image\"`,
            'rm -fr /asset-input/node_modules'
        ];
    }

    /**
     * Build steps for docker build
     * @param outputDir
     */
    protected build(moduleName: string, outputDir: string): string[] {
        return ['npm install', 'rm -fr ./node_modules', 'npm ci --omit=dev'];
    }

    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [`mkdir -p ${outputDir}/`, `cp -au /asset-input/* ${outputDir}/`];
    }

    /**
     * post-build cleanup
     *
     * @param outputDir
     * @returns
     */
    protected cleanup(moduleName: string, outputDir: string): string[] {
        return [`rm -fr ${outputDir}/.coverage`];
    }

    /**
     * Unit test execution
     *
     * @param outputDir
     * @returns
     */
    protected unitTest(moduleName: string, outputDir: string): string[] {
        return ['echo "Executing unit tests"', 'npm install', 'npm run test'];
    }
}

/**
 * Local build template implementation for Nodejs
 */
export class JavascriptLocalBuild extends LocalBuildTemplate {
    /**
     * build steps for local bundling
     *
     * @param outputDir
     * @returns
     */
    protected build(moduleName: string, outputDir: string): string[] {
        return ['npm ci --omit=dev'];
    }

    /**
     * pre-build steps for local bundling
     *
     * @param outputDir
     * @returns
     */
    protected preBuild(moduleName: string, outputDir: string): string[] {
        return [`echo local bundling ${moduleName}`, `cd ${moduleName}`, 'rm -fr node_modules'];
    }

    protected postBuild(moduleName: string, outputDir: string): string[] {
        return [`mkdir -p ${outputDir}`, `cp -R ${moduleName}/* ${outputDir}/`]; // for local build there is no post build steps.
    }

    /**
     * post-build steps for local bundling
     *
     * @param outputDir
     * @returns
     */
    protected cleanup(moduleName: string, outputDir: string): string[] {
        return [`rm -fr ${outputDir}/.coverage`];
    }

    /**
     * unit test execution for local bundling
     *
     * @param outputDir
     * @returns
     */
    protected unitTest(moduleName: string, outputDir: string): string[] {
        return ['echo "Executing unit tests"', `cd ${moduleName}`, 'npm install', 'npm run test'];
    }
}
