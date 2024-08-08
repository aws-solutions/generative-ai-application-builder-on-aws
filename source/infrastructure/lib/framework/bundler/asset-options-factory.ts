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

import {
    CHAT_LAMBDA_PYTHON_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_JS_LAYER_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_LAYER_PYTHON_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_NODE_TS_LAYER_RUNTIME as COMMERCIAL_REGION_LAMBDA_TS_LAYER_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
    LANGCHAIN_LAMBDA_LAYER_PYTHON_RUNTIME
} from '../../utils/constants';
import { BundlerAssetOptions } from './base-asset-options';
import { CdkJsonContextAssetOptions } from './cdk-json';
import { CDK_PYTHON_BUNDLER, REACTJS_ASSET_BUNDLER } from './constants';
import { JavascriptLayerAssetOptions } from './runtime/javascript-layer';
import { LangChainLayerAssetOptions } from './runtime/langchain-layer';
import { LangchainPythonVersionAssetOptions } from './runtime/langchain-py-version';
import { PythonAssetOptions } from './runtime/python';
import { PythonLayerAssetOptions } from './runtime/python-layer';
import { ReactjsAssetOptions } from './runtime/reactjs';
import { TypescriptLayerAssetOptions } from './runtime/typescript-layer';
import { TypescriptAssetOptions } from './runtime/typscript';

/**
 * A factory that provides asset packaging options for various runtimes.
 *
 */
class BundlerAssetOptionsFactory {
    private _assetOptionsMap: Map<any, BundlerAssetOptions>;

    /**
     * The constructor initializes
     */
    constructor() {
        this._assetOptionsMap = new Map();
        this._assetOptionsMap.set(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME, new PythonAssetOptions());
        this._assetOptionsMap.set(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, new TypescriptAssetOptions());
        this._assetOptionsMap.set(COMMERCIAL_REGION_LAMBDA_TS_LAYER_RUNTIME, new TypescriptLayerAssetOptions());
        this._assetOptionsMap.set(COMMERCIAL_REGION_LAMBDA_JS_LAYER_RUNTIME, new JavascriptLayerAssetOptions());
        this._assetOptionsMap.set(CDK_PYTHON_BUNDLER, new CdkJsonContextAssetOptions());
        this._assetOptionsMap.set(CHAT_LAMBDA_PYTHON_RUNTIME, new LangchainPythonVersionAssetOptions());
        this._assetOptionsMap.set(LANGCHAIN_LAMBDA_LAYER_PYTHON_RUNTIME, new LangChainLayerAssetOptions());
        this._assetOptionsMap.set(REACTJS_ASSET_BUNDLER, new ReactjsAssetOptions());
        this._assetOptionsMap.set(COMMERCIAL_REGION_LAMBDA_LAYER_PYTHON_RUNTIME, new PythonLayerAssetOptions());
        this._assetOptionsMap.set(GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME, new TypescriptAssetOptions());
        this._assetOptionsMap.set(GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME, new PythonAssetOptions());
    }

    public assetOptions(runtime: any): BundlerAssetOptions {
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
export class ApplicationAssetBundler {
    private static _assetFactory: BundlerAssetOptionsFactory;

    /**
     * Because the the class is a factory class, the constructor private. Call {@link ApplicationAssetBundler.assetBundlerFactory()} instead
     */
    private constructor() {}

    /**
     * A static method to return the Singleton instance of {@link AssetOptionsFactory} class
     */
    public static assetBundlerFactory(): BundlerAssetOptionsFactory {
        if (ApplicationAssetBundler._assetFactory === undefined) {
            this._assetFactory = new BundlerAssetOptionsFactory();
        }

        return this._assetFactory;
    }
}
