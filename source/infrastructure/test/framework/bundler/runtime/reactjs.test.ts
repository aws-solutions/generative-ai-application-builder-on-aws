// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import path from 'path';
import { BundlerAssetOptions } from '../../../../lib/framework/bundler/base-asset-options';
import { ReactjsAssetOptions } from '../../../../lib/framework/bundler/runtime/reactjs';
import { BundlerEnvValues } from './setup';

describe('When bundling JS lambda functions', () => {
    let bundlerAssetOption: BundlerAssetOptions;
    let assetOption: s3_assets.AssetOptions;
    let stack: cdk.Stack;
    const fakeModule = 'fake-module';
    const envValues = new BundlerEnvValues();

    beforeAll(() => {
        envValues.backupEnv();
        envValues.deleteEnvValues();
        stack = new cdk.Stack();
        bundlerAssetOption = new ReactjsAssetOptions();
        assetOption = bundlerAssetOption.options(stack, fakeModule);
    });

    afterAll(() => {
        envValues.restoreEnv();
    });

    it('should generate the following commands for a docker build', () => {
        expect(JSON.stringify(assetOption.bundling?.command)).toBe(
            JSON.stringify([
                'bash',
                '-c',
                `echo "Executing unit tests" && npm install && npm run test && echo "local bundling failed for ${path.dirname(__dirname).split('/').slice(0, -3).join('/')}/${fakeModule} and hence building with Docker image" && rm -fr /asset-input/node_modules && mkdir -p build/ && npm install && npm run build && cp -au /asset-input/build/* /asset-output/ && rm -fr /asset-output/.coverage`
            ])
        );
    });

    it('should generate the following commands for a local build', () => {
        const jsLocalBuild = (bundlerAssetOption as any).localBuild;
        expect(JSON.stringify(jsLocalBuild.bundle(stack, fakeModule, 'fake-output-dir'))).toBe(
            JSON.stringify([
                'echo "Executing unit tests"',
                'cd fake-module',
                'npm install',
                'npm run test',
                'echo local bundling fake-module',
                'cd fake-module',
                'rm -fr node_modules',
                'mkdir -p build',
                'npm install',
                'npm run build',
                'cp -R fake-module/build/* fake-output-dir/',
                'rm -fr fake-output-dir/.coverage'
            ])
        );
    });
});
