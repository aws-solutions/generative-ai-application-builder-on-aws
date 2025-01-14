#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import { IConstruct } from 'constructs';
import * as path from 'path';
import { COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } from '../../utils/constants';
import { BundlerAssetOptions } from './base-asset-options';
import { BaseBuildTemplate } from './base-build-package-template';
import {
    BUILD_STAGE_VAR,
    CDK_PYTHON_BUNDLER,
    CLEAN_UP_STAGE_VAR,
    DOCKER_BUILD_VAR,
    LOCAL_BUILD_VAR,
    MODULE_NAME_TOKEN,
    OUTPUT_DIR_TOKEN,
    POST_BUILD_STAGE_VAR,
    PRE_BUILD_STAGE_VAR,
    UNIT_TEST_STAGE_VAR
} from './constants';
import { DEPENDENCY_EXCLUDES } from './runtime/python';
import * as util from './utils/common';

export class CdkJsonContextAssetOptions implements BundlerAssetOptions {
    /**
     * An implementation of AssetOptions method to build artifacts.
     *
     * @param assetHash
     * @returns
     */
    public options(construct: IConstruct, entry: string, assetHash?: string): s3_assets.AssetOptions {
        entry = path.resolve(entry);
        return {
            ...(assetHash && { assetHash: assetHash, assetHashType: cdk.AssetHashType.CUSTOM }),
            bundling: {
                image: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.bundlingImage,
                user: 'root',
                command: new CdkJsonDockerBuildTemplate(CDK_PYTHON_BUNDLER).bundle(construct, entry, '/asset-output'),
                securityOpt: 'no-new-privileges:true',
                network: 'host',
                local: util.getLocalBundler(new CdkJsonLocalBuildTemplate(CDK_PYTHON_BUNDLER), construct, entry)
            } as cdk.BundlingOptions,
            exclude: DEPENDENCY_EXCLUDES
        } as s3_assets.AssetOptions;
    }
}

/**
 * Abstract class that contains build steps to read from cdk json file.
 */
abstract class CdkJsonBuildTemplate extends BaseBuildTemplate {
    protected buildTemplateKey: string;

    constructor(key: string) {
        super();
        this.buildTemplateKey = key;
    }

    private replaceTokens(cliList: string[], moduleName: string, outputDir: string): string[] {
        cliList.forEach((cli, index) => {
            let updatedCli = cli.replace(MODULE_NAME_TOKEN, moduleName);
            updatedCli = updatedCli.replace(OUTPUT_DIR_TOKEN, outputDir);

            cliList[index] = updatedCli;
        });
        return cliList;
    }

    protected abstract readContextProperty(construct: IConstruct, key: string): string[];
    /**
     * pre-build configuration defined in cdk json
     *
     * @param moduleName
     * @param outputDir
     * @returns
     */
    protected preBuild(moduleName: string, outputDir: string, construct: IConstruct): string[] {
        const cliList = this.readContextProperty(construct, PRE_BUILD_STAGE_VAR);
        return this.replaceTokens(cliList, moduleName, outputDir);
    }

    /**
     * post-build configuration defined in cdk json
     *
     * @param moduleName
     * @param outputDir
     * @returns
     */
    protected postBuild(moduleName: string, outputDir: string, construct: IConstruct): string[] {
        const cliList = this.readContextProperty(construct, POST_BUILD_STAGE_VAR);
        return this.replaceTokens(cliList, moduleName, outputDir);
    }

    /**
     * build configuration defined in cdk json
     *
     * @param moduleName
     * @param outputDir
     * @returns
     */
    protected build(moduleName: string, outputDir: string, construct: IConstruct): string[] {
        const cliList = this.readContextProperty(construct, BUILD_STAGE_VAR);
        return this.replaceTokens(cliList, moduleName, outputDir);
    }

    protected cleanup(moduleName: string, outputDir: string, construct: IConstruct): string[] {
        const cliList = this.readContextProperty(construct, CLEAN_UP_STAGE_VAR);
        return this.replaceTokens(cliList, moduleName, outputDir);
    }

    /**
     * unit test configuration defined in cdk json
     *
     * @param moduleName
     * @param outputDir
     * @returns
     */
    protected unitTest(moduleName: string, outputDir: string, construct: IConstruct): string[] {
        const cliList = this.readContextProperty(construct, UNIT_TEST_STAGE_VAR);
        return this.replaceTokens(cliList, moduleName, outputDir);
    }
}

/**
 * cdk json configuration that contains build steps for pre, post, build, and unit test steps
 */
export class CdkJsonLocalBuildTemplate extends CdkJsonBuildTemplate {
    /**
     * A utility method to read build steps from cdk json
     *
     * @param construct
     * @param key - key of the template definition in the context definition
     * @param buildStage - pre, post, build or unit-test stage within the template definition
     * @returns
     */
    protected readContextProperty(construct: IConstruct, buildStage: string): string[] {
        const buildTemplate = construct.node.tryGetContext(this.buildTemplateKey);
        let templateSteps: string[] = [];
        if (
            !Object.hasOwn(buildTemplate, LOCAL_BUILD_VAR) &&
            Object.hasOwn(buildTemplate[LOCAL_BUILD_VAR], buildStage)
        ) {
            templateSteps = buildTemplate[LOCAL_BUILD_VAR][buildStage];
        }

        if (!Array.isArray(templateSteps)) {
            throw new Error(`Incorrect build commands for ${this.buildTemplateKey} in stage ${buildStage}`);
        }

        return templateSteps;
    }
}

/**
 * Docker build configuration that contains build steps for pre, post, build, and unit test steps
 */
export class CdkJsonDockerBuildTemplate extends CdkJsonBuildTemplate {
    /**
     * A utility method to read build steps from cdk json
     *
     * @param construct
     * @param key - key of the template definition in the context definition
     * @param buildStage - pre, post, build or unit-test stage within the template definition
     * @returns
     */
    protected readContextProperty(construct: IConstruct, buildStage: string): string[] {
        const buildTemplate = construct.node.tryGetContext(this.buildTemplateKey);
        let templateSteps: string[] = [];
        if (
            !Object.hasOwn(buildTemplate, DOCKER_BUILD_VAR) &&
            Object.hasOwn(buildTemplate[DOCKER_BUILD_VAR], buildStage)
        ) {
            templateSteps = buildTemplate[DOCKER_BUILD_VAR][buildStage];
        }
        templateSteps = buildTemplate[DOCKER_BUILD_VAR][buildStage];

        if (!Array.isArray(templateSteps)) {
            throw new Error(`Incorrect build commands for ${this.buildTemplateKey} in stage ${buildStage}`);
        }

        return templateSteps;
    }

    /**
     * bundler implementation for docker builds
     *
     * @param moduleName
     * @param outputDir
     * @returns
     */
    public bundle(construct: IConstruct, moduleName: string, outputDir: string): string[] {
        return ['bash', '-c', super.bundle(construct, moduleName, outputDir).join(' && ')];
    }
}
