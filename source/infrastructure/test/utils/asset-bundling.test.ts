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
import * as s3_asset from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';
import * as commonutil from '../../lib/utils/common-utils';

import {
    AppAssetBundler,
    getCommandForTypescriptDockerBuild,
    getCommandsForNodejsDockerBuild,
    getCommandsForPythonDockerBuild,
    getCommandsForPythonDockerBuildWithPlatform,
    getCommandsForReactjsDockerBuild
} from '../../lib/utils/asset-bundling';

import { Template } from 'aws-cdk-lib/assertions';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    TYPESCRIPT
} from '../../lib/utils/constants';

describe('when bundling lambda assets', () => {
    it('should perform a successful python local build', () => {
        const assetOptions = AppAssetBundler.assetOptionsFactory.assetOptions(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME);
        expect(
            assetOptions
                .options('../infrastructure/test/mock-lambda-func/python-lambda')
                .bundling!.local!.tryBundle('../infrastructure/test/mock-lambda-func/python-lambda', {
                    image: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.bundlingImage
                })
        ).toBeTruthy();
    });

    it('should perform a successful python local build with specified platform', () => {
        const assetOptions = AppAssetBundler.assetOptionsFactory.assetOptions('PythonPlatformSpecific');
        expect(
            assetOptions
                .options('../infrastructure/test/mock-lambda-func/python-lambda')
                .bundling!.local!.tryBundle('../infrastructure/test/mock-lambda-func/python-lambda', {
                    image: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.bundlingImage
                })
        ).toBeTruthy();
    });

    it('should perform a successful nodejs local build', () => {
        const assetOptions = AppAssetBundler.assetOptionsFactory.assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME);
        expect(
            assetOptions
                .options('../infrastructure/test/mock-lambda-func/node-lambda')
                .bundling!.local!.tryBundle('../infrastructure/test/mock-lambda-func/node-lambda', {
                    image: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.bundlingImage
                })
        ).toBeTruthy();
    });

    it('should perform a successful typescript local build', () => {
        const assetOptions = AppAssetBundler.assetOptionsFactory.assetOptions(TYPESCRIPT);
        expect(
            assetOptions
                .options('../infrastructure/test/mock-lambda-func/typescript-lambda')
                .bundling!.local!.tryBundle('../infrastructure/test/mock-lambda-func/typescript-lambda', {
                    image: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.bundlingImage
                })
        ).toBeTruthy();
    });

    it('should throw an error if the runtime is not configured', () => {
        const runtime = lambda.Runtime.DOTNET_6;
        const output = () => {
            AppAssetBundler.assetOptionsFactory.assetOptions(runtime);
        };
        expect(output).toThrow(Error);
        expect(output).toThrow(`Provided runtime ${runtime} is not configured with this factory`);
    });
});

describe('when local bundling is successful lambda assets', () => {
    let localBundlingSpy: jest.SpyInstance;

    beforeEach(() => {
        localBundlingSpy = jest.spyOn(commonutil, 'localBundling');
    });

    it('should perform a succesful python local build', () => {
        const stack = new cdk.Stack();
        const runtime = COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME;
        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset(
                '../infrastructure/test/mock-lambda-func/python-lambda',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(runtime)
                    .options('../infrastructure/test/mock-lambda-func/python-lambda')
            ),
            runtime: runtime,
            handler: 'function.handler'
        });

        try {
            Template.fromStack(stack);
        } catch (error) {
            fail(`An error occurred, error is: ${error}`);
        }
        expect(localBundlingSpy).toHaveBeenCalledTimes(1);
        expect(localBundlingSpy).toHaveBeenCalledWith(
            expect.stringContaining(
                [
                    `cd ${path.resolve('../infrastructure/test/mock-lambda-func/python-lambda')}`,
                    'rm -fr .venv*',
                    'python3 -m venv .venv',
                    '. .venv/bin/activate',
                    'pip3 install -r requirements.txt -t '
                ].join(' && ')
            ),
            path.resolve('../infrastructure/test/mock-lambda-func/python-lambda'),
            expect.any(String)
        );
    });

    it('should perform a succesful python local build when the platform is specified', () => {
        const stack = new cdk.Stack();
        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset(
                '../infrastructure/test/mock-lambda-func/python-lambda',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions('PythonPlatformSpecific')
                    .options('../infrastructure/test/mock-lambda-func/python-lambda', undefined, {
                        platform: 'manylinux2014_x86_64',
                        pythonVersion: '3.11',
                        implementation: 'cp'
                    })
            ),
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
            handler: 'function.handler'
        });

        try {
            Template.fromStack(stack);
        } catch (error) {
            fail(`An error occurred, error is: ${error}`);
        }
        expect(localBundlingSpy).toHaveBeenCalledTimes(1);
        expect(localBundlingSpy).toHaveBeenCalledWith(
            expect.stringContaining(
                [
                    `echo local bundling ${path.resolve('../infrastructure/test/mock-lambda-func/python-lambda')}`,
                    `cd ${path.resolve('../infrastructure/test/mock-lambda-func/python-lambda')}`,
                    'rm -fr .venv*',
                    'python3 -m venv .venv',
                    '. .venv/bin/activate',
                    'python -m pip install --python-version 3.11 --platform manylinux2014_x86_64 --implementation cp --only-binary=:all: -r requirements.txt -t '
                ].join(' && ')
            ),
            path.resolve('../infrastructure/test/mock-lambda-func/python-lambda'),
            expect.any(String)
        );
    });

    it('should perform a successful nodejs local build', () => {
        const runtime = COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME;
        const stack = new cdk.Stack();
        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset(
                '../infrastructure/test/mock-lambda-func/node-lambda',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(runtime)
                    .options('../infrastructure/test/mock-lambda-func/node-lambda')
            ),
            runtime: runtime,
            handler: 'function.handler'
        });

        try {
            Template.fromStack(stack);
        } catch (error) {
            fail(`An error occurred, error is: ${error}`);
        }
        expect(localBundlingSpy).toHaveBeenCalledTimes(1);
        expect(localBundlingSpy).toHaveBeenLastCalledWith(
            expect.stringContaining(
                [
                    'cd ../infrastructure/test/mock-lambda-func/node-lambda',
                    'rm -fr node_modules',
                    'npm ci --omit=dev',
                    `rm -fr `
                ].join(' && ')
            ),
            '../infrastructure/test/mock-lambda-func/node-lambda',
            expect.any(String)
        );
    });

    it('should perform a successful typescript local build', () => {
        const runtime = COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME;
        const stack = new cdk.Stack();
        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset(
                '../infrastructure/test/mock-lambda-func/typescript-lambda',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(TYPESCRIPT)
                    .options('../infrastructure/test/mock-lambda-func/typescript-lambda')
            ),
            runtime: runtime,
            handler: 'index.handler'
        });

        try {
            Template.fromStack(stack);
        } catch (error) {
            fail(`An error occurred, error is: ${error}`);
        }

        expect(localBundlingSpy).toHaveBeenCalledTimes(1);
        expect(localBundlingSpy).toHaveBeenLastCalledWith(
            expect.stringContaining(
                [
                    'echo local bundling ../infrastructure/test/mock-lambda-func/typescript-lambda',
                    'cd ../infrastructure/test/mock-lambda-func/typescript-lambda',
                    'rm -fr node_modules',
                    'rm -fr dist',
                    'npm install',
                    'mkdir -p dist',
                    'npm run build',
                    'rm -fr ./node_modules',
                    'npm ci --omit=dev',
                    'cp -R ./node_modules dist/'
                ].join(' && ')
            ),
            '../infrastructure/test/mock-lambda-func/typescript-lambda/dist',
            expect.any(String)
        );
    });

    it('should perform a successful reactjs local build', () => {
        const stack = new cdk.Stack();
        new s3_asset.Asset(stack, 'UIAsset', {
            path: path.join(__dirname, '../../../ui-chat'),
            ...AppAssetBundler.assetOptionsFactory
                .assetOptions('Reactjs')
                .options(path.join(__dirname, '../../../ui-chat'))
        });

        try {
            Template.fromStack(stack);
        } catch (error) {
            fail(`An error occurred, error is: ${error}`);
        }
        expect(localBundlingSpy).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });
});

describe('when local bundling of assets is not successful', () => {
    it('should create a string array of commands for a successful docker python build', () => {
        expect(
            getCommandsForPythonDockerBuild('../infrastructure/test/mock-lambda-func/python-lambda', 'mock-lambda')
        ).toEqual([
            'bash',
            '-c',
            [
                'echo "local bundling failed for mock-lambda and hence building with Docker image"',
                'mkdir -p ../infrastructure/test/mock-lambda-func/python-lambda/',
                'rm -fr .venv*',
                'cp -au /asset-input/* ../infrastructure/test/mock-lambda-func/python-lambda/',
                'pip3 install -qr requirements.txt -t ../infrastructure/test/mock-lambda-func/python-lambda/',
                'rm -fr ../infrastructure/test/mock-lambda-func/python-lambda/.coverage'
            ].join(' && ')
        ]);
    });

    it('should create a string array of commands for a successful docker python build with platform specified', () => {
        expect(
            getCommandsForPythonDockerBuildWithPlatform(
                '../infrastructure/test/mock-lambda-func/python-lambda',
                'mock-lambda',
                {
                    platform: 'manylinux2014_x86_64',
                    implementation: 'cp',
                    pythonVersion: '3.11',
                    onlyBinary: ':all:',
                    requirements: 'requirements.txt'
                }
            )
        ).toEqual([
            'bash',
            '-c',
            [
                'echo "local bundling failed for mock-lambda and hence building with Docker image, for specific platform manylinux2014_x86_64"',
                'mkdir -p ../infrastructure/test/mock-lambda-func/python-lambda/',
                'rm -fr .venv*',
                'cp -au /asset-input/* ../infrastructure/test/mock-lambda-func/python-lambda/',
                'python -m pip install --python-version 3.11 --platform manylinux2014_x86_64 --implementation cp --only-binary=:all: -qr requirements.txt -t ../infrastructure/test/mock-lambda-func/python-lambda/',
                'rm -fr ../infrastructure/test/mock-lambda-func/python-lambda/.coverage'
            ].join(' && ')
        ]);
    });

    it('should create a string array of commands for a successful docker nodejs build', () => {
        expect(
            getCommandsForNodejsDockerBuild('../infrastructure/test/mock-lambda-func/node-lambda', 'mock-lambda')
        ).toEqual([
            'bash',
            '-c',
            [
                'echo "local bundling failed for mock-lambda and hence building with Docker image"',
                'rm -fr /asset-input/node_modules',
                'npm ci --omit=dev',
                'mkdir -p ../infrastructure/test/mock-lambda-func/node-lambda/',
                'cp -au /asset-input/* ../infrastructure/test/mock-lambda-func/node-lambda/',
                'rm -fr ../infrastructure/test/mock-lambda-func/node-lambda/.coverage'
            ].join(' && ')
        ]);
    });

    it('should create a string array of commands for a successful docker reactjs build', () => {
        expect(getCommandsForReactjsDockerBuild('../infrastructure/test/mock-ui', 'ui')).toEqual([
            'bash',
            '-c',
            [
                'echo "local bundling failed for ui and hence building with Docker image"',
                'npm install',
                'npm run build',
                'rm -fr /asset-input/node_modules',
                'npm ci --omit=dev',
                'mkdir -p ../infrastructure/test/mock-ui/',
                'cp -au /asset-input/* ../infrastructure/test/mock-ui/',
                'rm -fr ../infrastructure/test/mock-ui/.coverage'
            ].join(' && ')
        ]);
    });

    it('should create a string array of commands for a successful docker typescript build', () => {
        expect(
            getCommandForTypescriptDockerBuild(
                '../infrastructure/test/mock-lambda-func/typescript-lambda',
                'mock-lambda'
            )
        ).toEqual([
            'bash',
            '-c',
            [
                'echo "local bundling failed for mock-lambda and hence building with Docker image"',
                'rm -fr /asset-input/node_modules',
                'mkdir -p ../infrastructure/test/mock-lambda-func/typescript-lambda',
                'npm install',
                'npm run build',
                'rm -fr ./node_modules',
                'npm ci --omit=dev',
                'cp -au /asset-input/node_modules ../infrastructure/test/mock-lambda-func/typescript-lambda/',
                'cp -au /asset-input/dist/* ../infrastructure/test/mock-lambda-func/typescript-lambda/',
                'rm -fr ../infrastructure/test/mock-lambda-func/typescript-lambda/.coverage'
            ].join(' && ')
        ]);
    });
});

describe('when local bundling fails', () => {
    let localBundlingMock: jest.SpyInstance;

    beforeEach(() => {
        localBundlingMock = jest.spyOn(commonutil, 'localBundling').mockReturnValue(false);
    });

    it('should perform docker python bundling for python runtime', () => {
        const stack = new cdk.Stack();
        const runtime = COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME;
        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset(
                '../infrastructure/test/mock-lambda-func/python-lambda',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(runtime)
                    .options('../infrastructure/test/mock-lambda-func/python-lambda')
            ),
            runtime: runtime,
            handler: 'function.handler'
        });

        try {
            Template.fromStack(stack);
        } catch (error) {
            fail(`An error occurred, error is: ${error}`);
        }
        expect(localBundlingMock).toHaveBeenCalledTimes(1);
    });

    it('should perform docker nodejs bundling for node runtime', () => {
        const stack = new cdk.Stack();
        const runtime = COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME;
        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset(
                '../infrastructure/test/mock-lambda-func/node-lambda',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(runtime)
                    .options('../infrastructure/test/mock-lambda-func/node-lambda')
            ),
            runtime: runtime,
            handler: 'function.handler'
        });

        Template.fromStack(stack);
        expect(localBundlingMock).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });
});
