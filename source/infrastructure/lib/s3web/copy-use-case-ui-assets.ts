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
 **********************************************************************************************************************/

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
