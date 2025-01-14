#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import { IConstruct } from 'constructs';

/**
 * A type to allow for additional arguments to be passed to the bundling command
 */
export interface AdditionalInstallArguments {}

/**
 * Abstract type that defines the method for asset bundlers.
 */
export abstract class BundlerAssetOptions {
    public abstract options(
        construct: IConstruct,
        entry: string,
        packagingOptions?: AdditionalInstallArguments,
        assetHash?: string
    ): s3_assets.AssetOptions;
}
