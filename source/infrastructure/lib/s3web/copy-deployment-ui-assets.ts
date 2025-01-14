// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { UIAssetFolders } from '../utils/constants';
import { CopyUIAssets } from './copy-ui-assets-nested-stack';

/**
 * Class responsible for copying UI assets for deployment platforms.
 * Extends the base CopyUIAssets class to override the folder
 * for deployment specific assets.
 */
export class CopyDeploymentUIAssets extends CopyUIAssets {
    public getUIAssetFolder(): string {
        return UIAssetFolders.DEPLOYMENT_PLATFORM;
    }
}
