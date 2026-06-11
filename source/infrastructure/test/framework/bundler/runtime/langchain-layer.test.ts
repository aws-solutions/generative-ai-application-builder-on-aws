// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import path from 'path';
import { BundlerAssetOptions } from '../../../../lib/framework/bundler/base-asset-options';
import { LangChainLayerAssetOptions } from '../../../../lib/framework/bundler/runtime/langchain-layer';
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
        envValues.deleteEnvValues();
        stack = new cdk.Stack();
        bundlerAssetOption = new LangChainLayerAssetOptions();
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
                `echo "Executing unit tests" && python3 -m venv .venv-test && source .venv-test/bin/activate && pip install uv && uv sync --frozen && uv run pytest --cov --cov-report=term-missing && deactivate && echo "local bundling failed for ${path.dirname(__dirname).split('/').slice(0, -3).join('/')}/${fakeModule} and hence building with Docker image" && rm -fr .venv* && rm -fr dist && rm -fr .coverage && rm -fr coverage && python3 -m pip install uv --upgrade && uv build && uv sync --no-dev --frozen && uv export --no-hashes --no-dev --frozen --output-file /asset-output/requirements.txt && uv pip install -r /asset-output/requirements.txt --python-version 3.13 --python-platform x86_64-manylinux2014 --only-binary=:all: --target /asset-output/python/ && uv pip install --no-deps --target /asset-output/python/ dist/*.whl && find /asset-output | grep -E "(/__pycache__$|.pyc$|.pyo$|.coverage$)" | xargs rm -rf && rm -fr /asset-output/requirements.txt`
            ])
        );
    });

    it('should generate the following commands for a local build', () => {
        const localBuild = (bundlerAssetOption as any).localBuild;
        expect(JSON.stringify(localBuild.bundle(stack, fakeModule, 'fake-output-dir'))).toBe(
            JSON.stringify([
                'cd fake-module',
                'echo "Executing unit tests"',
                'python3 -m venv .venv-test',
                'source .venv-test/bin/activate',
                'pip install uv',
                'uv sync --frozen',
                'uv run pytest --cov --cov-report=term-missing',
                'deactivate',
                'echo local bundling fake-module',
                'cd fake-module',
                'rm -fr .venv*',
                'rm -fr dist',
                'rm -fr coverage',
                'rm -fr .coverage',
                'python3 -m venv .venv',
                '. .venv/bin/activate',
                'python3 -m pip install uv --upgrade',
                'uv build',
                'uv sync --no-dev --frozen',
                'cd fake-module',
                'python3 -m pip install uv --upgrade',
                'uv export --no-hashes --no-dev --frozen --output-file fake-output-dir/requirements.txt',
                'uv pip install -r fake-output-dir/requirements.txt --python-version 3.13 --python-platform x86_64-manylinux2014 --only-binary=:all: --target fake-output-dir/python/',
                'uv pip install --no-deps --target fake-output-dir/python/ dist/*.whl',
                'deactivate',
                'find fake-output-dir | grep -E "(/__pycache__$|.pyc$|.pyo$|.coverage$|dist$|.venv*$)" | xargs rm -rf',
                'rm -fr fake-output-dir/requirements.txt'
            ])
        );
    });
});
