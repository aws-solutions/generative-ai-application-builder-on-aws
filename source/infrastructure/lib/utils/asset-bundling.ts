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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';
import { localBundling } from '../utils/common-utils';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    PYTHON_PIP_BUILD_PLATFORM,
    PYTHON_PIP_WHEEL_IMPLEMENTATION,
    PYTHON_VERSION,
    TYPESCRIPT
} from './constants';

export const DEPENDENCY_EXCLUDES = ['__pycache__', '*.pyc'];

export interface AdditionalInstallArguments {}

export class PipInstallArguments implements AdditionalInstallArguments {
    platform?: string;
    implementation?: string;
    pythonVersion?: string;
    onlyBinary?: string;
    requirements?: string;
}

interface AppAssetOptions {
    options: (entry: string, assetHash?: string, pipOptions?: AdditionalInstallArguments) => s3_assets.AssetOptions;
}

/**
 * Function to evaluate any pip options, and replace with defaults if attribute is empty
 * @param pipOptions python pip command options received
 * @returns
 */
export function resolvePipOptions(pipOptions?: PipInstallArguments): PipInstallArguments {
    return {
        platform: pipOptions?.platform ?? PYTHON_PIP_BUILD_PLATFORM,
        implementation: pipOptions?.implementation ?? PYTHON_PIP_WHEEL_IMPLEMENTATION,
        pythonVersion: pipOptions?.pythonVersion ?? PYTHON_VERSION,
        onlyBinary: pipOptions?.onlyBinary ?? ':all:',
        requirements: pipOptions?.requirements ?? 'requirements.txt'
    };
}

/**
 * A class that knows how to build and package lambda functions with python runtime
 */
class PythonAssetOptions implements AppAssetOptions {
    public options(entry: string, assetHash?: string): s3_assets.AssetOptions {
        entry = path.resolve(entry);
        return {
            ...(assetHash && {
                assetHash: assetHash,
                assetHashType: cdk.AssetHashType.CUSTOM
            }),
            bundling: {
                image: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.bundlingImage,
                user: 'root',
                command: getCommandsForPythonDockerBuild('/asset-output', entry),
                securityOpt: 'no-new-privileges:true',
                network: 'host',
                local: {
                    tryBundle(outputDir: string) {
                        return localBundling(
                            [
                                `echo local bundling ${entry}`,
                                `cd ${entry}`,
                                'rm -fr .venv*',
                                'python3 -m venv .venv',
                                '. .venv/bin/activate',
                                `pip3 install -r requirements.txt -t ${outputDir}`,
                                'deactivate',
                                'rm -fr .venv*',
                                `rm -fr ${outputDir}/.coverage`
                            ].join(' && '),
                            entry,
                            outputDir
                        );
                    }
                } as cdk.ILocalBundling
            } as cdk.BundlingOptions,
            exclude: DEPENDENCY_EXCLUDES
        } as s3_assets.AssetOptions;
    }
}

/**
 * A class that knows how to build and package python runtimes built for a specific platform
 */
class PythonAssetOptionsWithPlatform implements AppAssetOptions {
    public options(
        entry: string,
        assetHash?: string,
        packagingOptions?: AdditionalInstallArguments
    ): s3_assets.AssetOptions {
        entry = path.resolve(entry);
        const pipOptions = packagingOptions as PipInstallArguments;
        // if pipOptions is not provided use default values for platform
        const evaluatedPipOptions = resolvePipOptions(pipOptions);

        return {
            ...(assetHash && {
                assetHash: assetHash,
                assetHashType: cdk.AssetHashType.CUSTOM
            }),
            bundling: {
                image: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.bundlingImage,
                user: 'root',
                command: getCommandsForPythonDockerBuildWithPlatform('/asset-output', entry, evaluatedPipOptions),
                securityOpt: 'no-new-privileges:true',
                network: 'host',

                local: {
                    tryBundle(outputDir: string) {
                        return localBundling(
                            [
                                `echo local bundling ${entry}`,
                                `cd ${entry}`,
                                'rm -fr .venv*',
                                'python3 -m venv .venv',
                                '. .venv/bin/activate',
                                `python -m pip install --python-version ${evaluatedPipOptions.pythonVersion} --platform ${evaluatedPipOptions.platform} --implementation ${evaluatedPipOptions.implementation} --only-binary=${evaluatedPipOptions.onlyBinary} -r ${evaluatedPipOptions.requirements} -t ${outputDir}`,
                                'deactivate',
                                'rm -fr .venv*',
                                `rm -fr ${outputDir}/.coverage`
                            ].join(' && '),
                            entry,
                            outputDir
                        );
                    }
                } as cdk.ILocalBundling
            } as cdk.BundlingOptions,
            exclude: DEPENDENCY_EXCLUDES
        } as s3_assets.AssetOptions;
    }
}

/**
 * A class that knows how to build and package lambda function with nodejs runtime
 */
class NodejsAssetOptions implements AppAssetOptions {
    public options(entry: string, assetHash?: string): s3_assets.AssetOptions {
        return {
            ...(assetHash && {
                assetHash: assetHash,
                assetHashType: cdk.AssetHashType.CUSTOM
            }),
            bundling: {
                image: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.bundlingImage,
                user: 'root',
                command: getCommandsForNodejsDockerBuild('/asset-output', entry),
                securityOpt: 'no-new-privileges:true',
                network: 'host',
                local: {
                    tryBundle(outputDir: string) {
                        return localBundling(
                            [
                                `echo local bundling ${entry}`,
                                `cd ${entry}`,
                                'rm -fr node_modules',
                                'npm ci --omit=dev',
                                `rm -fr ${outputDir}/.coverage`
                            ].join(' && '),
                            entry,
                            outputDir
                        );
                    }
                } as cdk.ILocalBundling
            } as cdk.BundlingOptions
        } as s3_assets.AssetOptions;
    }
}

/**
 * Asset bundler for typescript lambdas
 */
class TypescriptAssetOptions implements AppAssetOptions {
    public options(entry: string, assetHash?: string): s3_assets.AssetOptions {
        return {
            ...(assetHash && {
                assetHash: assetHash,
                assetHashType: cdk.AssetHashType.CUSTOM
            }),
            bundling: {
                image: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.bundlingImage,
                user: 'root',
                command: getCommandForTypescriptDockerBuild('/asset-output', entry),
                securityOpt: 'no-new-privileges:true',
                network: 'host',
                local: {
                    tryBundle(outputDir: string) {
                        return localBundling(
                            [
                                `echo local bundling ${entry}`,
                                `cd ${entry}`,
                                'rm -fr node_modules',
                                'rm -fr dist',
                                'npm install',
                                'mkdir -p dist',
                                'npm run build',
                                'rm -fr ./node_modules',
                                'npm ci --omit=dev',
                                'cp -R ./node_modules dist/',
                                `rm -fr ${outputDir}/.coverage`
                            ].join(' && '),
                            `${entry}/dist`,
                            outputDir
                        );
                    }
                } as cdk.ILocalBundling
            } as cdk.BundlingOptions
        } as s3_assets.AssetOptions;
    }
}

/**
 * A class that knows how to build and package lambda function with nodejs runtime
 */
class ReactjsAssetOptions implements AppAssetOptions {
    public options(entry: string, assetHash?: string): s3_assets.AssetProps {
        return {
            ...(assetHash && {
                assetHash: assetHash,
                assetHashType: cdk.AssetHashType.CUSTOM
            }),
            bundling: {
                image: lambda.Runtime.NODEJS_18_X.bundlingImage,
                user: 'root',
                command: getCommandsForReactjsDockerBuild('/asset-output', entry),
                securityOpt: 'no-new-privileges:true',
                network: 'host',
                local: {
                    tryBundle(outputDir: string) {
                        return localBundling(
                            [`cd ${entry}`, 'mkdir -p build', 'npm install', 'npm run build'].join(' && '),
                            `${entry}/build`,
                            outputDir
                        );
                    }
                } as cdk.ILocalBundling
            } as cdk.BundlingOptions
        } as s3_assets.AssetProps;
    }
}

/**
 * A factory that provides asset packaging options for various runtimes.
 *
 */
class AppAssetOptionsFactory {
    private _assetOptionsMap: Map<any, AppAssetOptions>;

    /**
     * The constructor initializes
     */
    constructor() {
        this._assetOptionsMap = new Map();
        this._assetOptionsMap.set(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME, new PythonAssetOptions());
        this._assetOptionsMap.set(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, new NodejsAssetOptions());
        this._assetOptionsMap.set('Reactjs', new ReactjsAssetOptions());
        this._assetOptionsMap.set('PythonPlatformSpecific', new PythonAssetOptionsWithPlatform());
        this._assetOptionsMap.set(TYPESCRIPT, new TypescriptAssetOptions());
    }

    public assetOptions(runtime: any): AppAssetOptions {
        if (this._assetOptionsMap.has(runtime)) {
            return this._assetOptionsMap.get(runtime)!;
        } else {
            throw new Error(`Provided runtime ${runtime} is not configured with this factory`);
        }
    }
}

/**
 * A singleton implementation to get an instance of a factory that provides bundling implementations for various
 * runtimes.
 *
 */
export class AppAssetBundler {
    private static _assetFactory: AppAssetOptionsFactory;

    /**
     * Because the the class is a factory class, the constructor private. Call {@link AppAssetBundler.assetOptionsFactory()} instead
     */
    private constructor() {}

    /**
     * A static method to return the Singleton instance of {@link AssetOptionsFactory} class
     */
    public static get assetOptionsFactory(): AppAssetOptionsFactory {
        if (AppAssetBundler._assetFactory === undefined) {
            this._assetFactory = new AppAssetOptionsFactory();
        }

        return this._assetFactory;
    }
}

/**
 * This method builds the a string array of commands to be executed on docker container to package a python asset (in most cases
 * either a lambda function that can be executed on a python environment or a python lambda layer)
 *
 * @param outputDir - the directory where the packaged assets should be copied to for deployment
 * @param moduleName - The name of the module to be included when printing an `echo` message on the terminal
 * @returns a string array of commands that knows how to package and stage the asset
 */
export function getCommandsForPythonDockerBuild(outputDir: string, moduleName: string): string[] {
    return [
        'bash',
        '-c',
        [
            `echo "local bundling failed for ${moduleName} and hence building with Docker image"`,
            `mkdir -p ${outputDir}/`,
            'rm -fr .venv*',
            `cp -au /asset-input/* ${outputDir}/`,
            `pip3 install -qr requirements.txt -t ${outputDir}/`,
            `rm -fr ${outputDir}/.coverage`
        ].join(' && ')
    ];
}

/**
 * This method builds the a string array of commands to be executed on docker container to package a python package with a platform and implementation specified
 * @param outputDir - the directory where the packaged assets should be copied to for deployment
 * @param moduleName - The name of the module to be included when printing an `echo` message on the terminal
 * @param pipOptions - limited set up options for pip command that can be specified
 * @returns
 */
export function getCommandsForPythonDockerBuildWithPlatform(
    outputDir: string,
    moduleName: string,
    pipOptions: PipInstallArguments
): string[] {
    return [
        'bash',
        '-c',
        [
            `echo "local bundling failed for ${moduleName} and hence building with Docker image, for specific platform ${pipOptions.platform}"`,
            `mkdir -p ${outputDir}/`,
            'rm -fr .venv*',
            `cp -au /asset-input/* ${outputDir}/`,
            `python -m pip install --python-version ${pipOptions.pythonVersion} --platform ${pipOptions.platform} --implementation ${pipOptions.implementation} --only-binary=${pipOptions.onlyBinary} -qr ${pipOptions.requirements} -t ${outputDir}/`,
            `rm -fr ${outputDir}/.coverage`
        ].join(' && ')
    ];
}

/**
 * This method builds the a string array of commands to be executed on docker container to package a nodejs asset (in most cases
 * either a lambda function that can be executed on a nodejs environment or a nodejs lambda layer)
 *
 * @param outputdir - the directory where the packaged assets should be copied to for deployment
 * @param moduleName - The name of the module to be included when printing an `echo` message on the terminal
 * @returns a string array of commands that knows how to package and stage the asset
 */
export function getCommandsForNodejsDockerBuild(outputDir: string, moduleName: string): string[] {
    return [
        'bash',
        '-c',
        [
            `echo "local bundling failed for ${moduleName} and hence building with Docker image"`,
            `rm -fr /asset-input/node_modules`,
            'npm ci --omit=dev',
            `mkdir -p ${outputDir}/`,
            `cp -au /asset-input/* ${outputDir}/`,
            `rm -fr ${outputDir}/.coverage`
        ].join(' && ')
    ];
}

/**
 * This method builds the a string array of commands to be executed on docker container to package a typescript lambda or
 * lambda layer asset
 *
 * @param outputdir - the directory where the packaged assets should be copied to for deployment
 * @param moduleName - The name of the module to be included when printing an `echo` message on the terminal
 * @returns a string array of commands that knows how to package and stage the asset
 */
export function getCommandForTypescriptDockerBuild(outputDir: string, moduleName: string): string[] {
    return [
        'bash',
        '-c',
        [
            `echo "local bundling failed for ${moduleName} and hence building with Docker image"`,
            `rm -fr /asset-input/node_modules`,
            `mkdir -p ${outputDir}`,
            'npm install',
            'npm run build',
            'rm -fr ./node_modules',
            'npm ci --omit=dev',
            `cp -au /asset-input/node_modules ${outputDir}/`,
            `cp -au /asset-input/dist/* ${outputDir}/`,
            `rm -fr ${outputDir}/.coverage`
        ].join(' && ')
    ];
}

/**
 * This method builds the a string array of commands to be executed on docker container to package a typescript lambda or
 * lambda layer asset
 *
 * @param outputdir - the directory where the packaged assets should be copied to for deployment
 * @param moduleName - The name of the module to be included when printing an `echo` message on the terminal
 * @returns a string array of commands that knows how to package and stage the asset
 */
export function getCommandForTypescriptLayerDockerBuild(outputDir: string, moduleName: string): string[] {
    return [
        'bash',
        '-c',
        [
            `echo "local bundling failed for ${moduleName} and hence building with Docker image"`,
            `rm -fr /asset-input/node_modules`,
            `mkdir -p ${outputDir}`,
            'npm install',
            'npx run build',
            'rm -fr ./node_modules',
            'npm ci --omit=dev',
            `cp -au /asset-input/node_modules/* ${outputDir}/../`,
            `cp -au /asset-input/dist/* ${outputDir}/`,
            `rm -fr ${outputDir}/.coverage`
        ].join(' && ')
    ];
}

/**
 * This method builds the string array of commands to be executed on docker container to package a react asset
 *
 * @param inputdir - the directory which contains the assets to be staged and packaged
 * @param outputdir - the directory where the packaged assets should be copied to for deployment
 * @param moduleName - The name of the module to be included when printing an `echo` message on the terminal
 * @returns a string array of commands that knows how to package and stage the asset
 */
export function getCommandsForReactjsDockerBuild(outputDir: string, moduleName: string): string[] {
    return [
        'bash',
        '-c',
        [
            `echo "local bundling failed for ${moduleName} and hence building with Docker image"`,
            'npm install',
            'npm run build',
            `rm -fr /asset-input/node_modules`,
            'npm ci --omit=dev',
            `mkdir -p ${outputDir}/`,
            `cp -au /asset-input/* ${outputDir}/`,
            `rm -fr ${outputDir}/.coverage`
        ].join(' && ')
    ];
}
