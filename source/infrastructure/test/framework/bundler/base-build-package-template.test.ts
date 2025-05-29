// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import path from 'path';
import { ApplicationAssetBundler } from '../../../lib/framework/bundler/asset-options-factory';
import { BundlerAssetOptions } from '../../../lib/framework/bundler/base-asset-options';
import { CdkJsonContextAssetOptions } from '../../../lib/framework/bundler/cdk-json';
import {
    BUILD_FLAG,
    CDK_PYTHON_BUNDLER,
    CLEAN_UP_FLAG,
    PRE_BUILD_FLAG,
    REACTJS_ASSET_BUNDLER,
    SKIP_BUILD_VAR,
    SKIP_CLEAN_UP_VAR,
    SKIP_POST_BUILD_VAR,
    SKIP_PRE_BUILD_VAR,
    SKIP_UNIT_TEST_VAR,
    UNIT_TEST_FLAG
} from '../../../lib/framework/bundler/constants';
import { JavascriptLayerAssetOptions } from '../../../lib/framework/bundler/runtime/javascript-layer';
import { LangChainLayerAssetOptions } from '../../../lib/framework/bundler/runtime/langchain-layer';
import { LangchainPythonVersionAssetOptions } from '../../../lib/framework/bundler/runtime/langchain-py-version';
import { PythonAssetOptions } from '../../../lib/framework/bundler/runtime/python';
import { PythonLayerAssetOptions } from '../../../lib/framework/bundler/runtime/python-layer';
import { ReactjsAssetOptions } from '../../../lib/framework/bundler/runtime/reactjs';
import { TypescriptLayerAssetOptions } from '../../../lib/framework/bundler/runtime/typescript-layer';
import { TypescriptAssetOptions } from '../../../lib/framework/bundler/runtime/typscript';
import {
    CHAT_LAMBDA_PYTHON_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_JS_LAYER_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_LAYER_PYTHON_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_NODE_TS_LAYER_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
    LANGCHAIN_LAMBDA_LAYER_PYTHON_RUNTIME
} from '../../../lib/utils/constants';
import { BundlerEnvValues } from './runtime/setup';

describe("When a bundling stage's environment variables are set", () => {
    describe('when python cleanup stage is skipped using environment variables', () => {
        let bundlerAssetOption: BundlerAssetOptions;
        let assetOption: s3_assets.AssetOptions;
        let stack: cdk.Stack;
        const envValues = new BundlerEnvValues();
        const fakeModule = 'fake-module';

        beforeAll(() => {
            envValues.backupEnv();
            envValues.deleteEnvValues();
            process.env[SKIP_CLEAN_UP_VAR] = 'true';
            stack = new cdk.Stack();
            bundlerAssetOption = new PythonAssetOptions();
            assetOption = bundlerAssetOption.options(stack, fakeModule);
        });

        afterAll(() => {
            envValues.restoreEnv();
        });

        it('should not have clean up stage in the list of commands', () => {
            expect(JSON.stringify(assetOption.bundling?.command)).toBe(
                JSON.stringify([
                    'bash',
                    '-c',
                    `echo "Executing unit tests" && python3 -m venv .venv-test && source .venv-test/bin/activate && pip install poetry && poetry install && poetry run pytest --cov --cov-report=term-missing && deactivate && echo "local bundling failed for ${path
                        .dirname(__dirname)
                        .split('/')
                        .slice(0, -2)
                        .join(
                            '/'
                        )}/${fakeModule} and hence building with Docker image" && rm -fr .venv* && rm -fr dist && rm -fr .coverage && rm -fr coverage && python3 -m pip install poetry --upgrade && python3 -m pip install poetry --upgrade && poetry build && poetry install --only main && cp -au /asset-input/* /asset-output/ && poetry run pip install -t /asset-output dist/*.whl`
                ])
            );
        });
    });

    describe('when python cleanup stage is enabled using environment variables', () => {
        let bundlerAssetOption: BundlerAssetOptions;
        let assetOption: s3_assets.AssetOptions;
        let stack: cdk.Stack;
        const envValues = new BundlerEnvValues();
        const fakeModule = 'fake-module';

        beforeAll(() => {
            envValues.backupEnv();
            envValues.deleteEnvValues();
            process.env[SKIP_UNIT_TEST_VAR] = 'true';
            process.env[SKIP_PRE_BUILD_VAR] = 'true';
            process.env[SKIP_POST_BUILD_VAR] = 'true';
            process.env[SKIP_BUILD_VAR] = 'true';
            process.env[SKIP_CLEAN_UP_VAR] = 'false';
            stack = new cdk.Stack();
            bundlerAssetOption = new PythonAssetOptions();
            assetOption = bundlerAssetOption.options(stack, fakeModule);
        });

        afterAll(() => {
            envValues.restoreEnv();
        });

        it('should not have clean up stage in the list of commands', () => {
            expect(JSON.stringify(assetOption.bundling?.command)).toBe(
                JSON.stringify([
                    'bash',
                    '-c',
                    'find /asset-output | grep -E "(/__pycache__$|.pyc$|.pyo$|.coverage$)" | xargs rm -rf'
                ])
            );
        });
    });

    describe('when python post build stage is enabled using environment variables', () => {
        let bundlerAssetOption: BundlerAssetOptions;
        let assetOption: s3_assets.AssetOptions;
        let stack: cdk.Stack;
        const envValues = new BundlerEnvValues();
        const fakeModule = 'fake-module';

        beforeAll(() => {
            envValues.backupEnv();
            envValues.deleteEnvValues();
            process.env[SKIP_UNIT_TEST_VAR] = 'true';
            process.env[SKIP_PRE_BUILD_VAR] = 'true';
            process.env[SKIP_POST_BUILD_VAR] = 'false';
            process.env[SKIP_BUILD_VAR] = 'true';
            process.env[SKIP_CLEAN_UP_VAR] = 'true';
            stack = new cdk.Stack();
            bundlerAssetOption = new PythonAssetOptions();
            assetOption = bundlerAssetOption.options(stack, fakeModule);
        });

        afterAll(() => {
            envValues.restoreEnv();
        });

        it('should not have clean up stage in the list of commands', () => {
            expect(JSON.stringify(assetOption.bundling?.command)).toBe(
                JSON.stringify([
                    'bash',
                    '-c',
                    'python3 -m pip install poetry --upgrade && cp -au /asset-input/* /asset-output/ && poetry run pip install -t /asset-output dist/*.whl'
                ])
            );
        });
    });

    describe('when python bundling environment variables are not set', () => {
        let bundlerAssetOption: BundlerAssetOptions;
        let assetOption: s3_assets.AssetOptions;
        let stack: cdk.Stack;
        const envValues = new BundlerEnvValues();
        const fakeModule = 'fake-module';

        beforeAll(() => {
            envValues.backupEnv();
            envValues.deleteEnvValues();
            stack = new cdk.Stack();
            bundlerAssetOption = new PythonAssetOptions();
            assetOption = bundlerAssetOption.options(stack, fakeModule);
        });

        afterAll(() => {
            envValues.restoreEnv();
        });

        it('should build everything', () => {
            expect(JSON.stringify(assetOption.bundling?.command)).toBe(
                JSON.stringify([
                    'bash',
                    '-c',
                    `echo "Executing unit tests" && python3 -m venv .venv-test && source .venv-test/bin/activate && pip install poetry && poetry install && poetry run pytest --cov --cov-report=term-missing && deactivate && echo "local bundling failed for ${path
                        .dirname(__dirname)
                        .split('/')
                        .slice(0, -2)
                        .join(
                            '/'
                        )}/${fakeModule} and hence building with Docker image" && rm -fr .venv* && rm -fr dist && rm -fr .coverage && rm -fr coverage && python3 -m pip install poetry --upgrade && python3 -m pip install poetry --upgrade && poetry build && poetry install --only main && cp -au /asset-input/* /asset-output/ && poetry run pip install -t /asset-output dist/*.whl && find /asset-output | grep -E "(/__pycache__$|.pyc$|.pyo$|.coverage$)" | xargs rm -rf`
                ])
            );
        });
    });

    describe('when the asset bundler factory is loaded', () => {
        it('should provide the appropriate assetoption implementation based on the key', () => {
            const bundlerFactory = ApplicationAssetBundler.assetBundlerFactory();
            expect(bundlerFactory.assetOptions(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME)).toBeInstanceOf(
                PythonAssetOptions
            );
            expect(bundlerFactory.assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)).toBeInstanceOf(
                TypescriptAssetOptions
            );
            expect(bundlerFactory.assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_TS_LAYER_RUNTIME)).toBeInstanceOf(
                TypescriptLayerAssetOptions
            );
            expect(bundlerFactory.assetOptions(COMMERCIAL_REGION_LAMBDA_JS_LAYER_RUNTIME)).toBeInstanceOf(
                JavascriptLayerAssetOptions
            );
            expect(bundlerFactory.assetOptions(CDK_PYTHON_BUNDLER)).toBeInstanceOf(CdkJsonContextAssetOptions);
            expect(bundlerFactory.assetOptions(CHAT_LAMBDA_PYTHON_RUNTIME)).toBeInstanceOf(
                LangchainPythonVersionAssetOptions
            );
            expect(bundlerFactory.assetOptions(LANGCHAIN_LAMBDA_LAYER_PYTHON_RUNTIME)).toBeInstanceOf(
                LangChainLayerAssetOptions
            );
            expect(bundlerFactory.assetOptions(REACTJS_ASSET_BUNDLER)).toBeInstanceOf(ReactjsAssetOptions);
            expect(bundlerFactory.assetOptions(COMMERCIAL_REGION_LAMBDA_LAYER_PYTHON_RUNTIME)).toBeInstanceOf(
                PythonLayerAssetOptions
            );
            expect(bundlerFactory.assetOptions(GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME)).toBeInstanceOf(
                PythonAssetOptions
            );
            expect(bundlerFactory.assetOptions(GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME)).toBeInstanceOf(
                TypescriptAssetOptions
            );
        });

        it('should fail for a non-existent asset bundler', () => {
            const runtime = 'non-existent-key';
            try {
                ApplicationAssetBundler.assetBundlerFactory().assetOptions(runtime);
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as any).message).toBe(`Provided runtime ${runtime} is not configured with this factory`);
            }
        });
    });
});

describe("When a bundling stage's cdk.json variables are set", () => {
    describe('when python unit test and cleanup stage is skipped using cdk.json', () => {
        let bundlerAssetOption: BundlerAssetOptions;
        let assetOption: s3_assets.AssetOptions;
        let stack: cdk.Stack;
        const envValues = new BundlerEnvValues();
        const fakeModule = 'fake-module';

        beforeAll(() => {
            envValues.backupEnv();
            envValues.deleteEnvValues();
            const app = new cdk.App({
                context: {
                    [UNIT_TEST_FLAG]: false,
                    [CLEAN_UP_FLAG]: false
                }
            });
            stack = new cdk.Stack(app);
            bundlerAssetOption = new PythonAssetOptions();
            assetOption = bundlerAssetOption.options(stack, fakeModule);
        });

        afterAll(() => {
            envValues.restoreEnv();
        });

        it('should not have unit test and clean up commands', () => {
            expect(JSON.stringify(assetOption.bundling?.command)).toBe(
                JSON.stringify([
                    'bash',
                    '-c',
                    `echo "local bundling failed for ${path
                        .dirname(__dirname)
                        .split('/')
                        .slice(0, -2)
                        .join(
                            '/'
                        )}/${fakeModule} and hence building with Docker image" && rm -fr .venv* && rm -fr dist && rm -fr .coverage && rm -fr coverage && python3 -m pip install poetry --upgrade && python3 -m pip install poetry --upgrade && poetry build && poetry install --only main && cp -au /asset-input/* /asset-output/ && poetry run pip install -t /asset-output dist/*.whl`
                ])
            );
        });
    });

    describe('when all but post build stage is enabled using cdk.json', () => {
        let bundlerAssetOption: BundlerAssetOptions;
        let assetOption: s3_assets.AssetOptions;
        let stack: cdk.Stack;
        const envValues = new BundlerEnvValues();
        const fakeModule = 'fake-module';

        beforeAll(() => {
            envValues.backupEnv();
            envValues.deleteEnvValues();
            const app = new cdk.App({
                context: {
                    [UNIT_TEST_FLAG]: false,
                    [CLEAN_UP_FLAG]: false,
                    [BUILD_FLAG]: false,
                    [PRE_BUILD_FLAG]: false
                }
            });
            stack = new cdk.Stack(app);
            bundlerAssetOption = new PythonAssetOptions();
            assetOption = bundlerAssetOption.options(stack, fakeModule);
        });

        afterAll(() => {
            envValues.restoreEnv();
        });

        it('should not have unit test and clean up commands', () => {
            expect(JSON.stringify(assetOption.bundling?.command)).toBe(
                JSON.stringify([
                    'bash',
                    '-c',
                    'cp -au /asset-input/* /asset-output/ && poetry run pip install -t /asset-output dist/*.whl'
                ])
            );
        });
    });
});
