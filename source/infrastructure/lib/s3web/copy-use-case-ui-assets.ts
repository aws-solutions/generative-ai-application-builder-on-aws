// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { UIAssetFolders } from '../utils/constants';
import { CopyUIAssets } from './copy-ui-assets-nested-stack';

/**
 * Class responsible for copying UI assets for chat use case.
 * Extends the base CopyUIAssets class to override the folder
 * for chat use case specific assets.
 */
export class CopyUseCaseUIAssets extends CopyUIAssets {
    public getUIAssetFolder(): string {
        return UIAssetFolders.CHAT;
    }
}
