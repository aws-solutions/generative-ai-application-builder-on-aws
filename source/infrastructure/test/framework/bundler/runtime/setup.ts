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
    SKIP_BUILD_VAR,
    SKIP_CLEAN_UP_VAR,
    SKIP_POST_BUILD_VAR,
    SKIP_PRE_BUILD_VAR,
    SKIP_UNIT_TEST_VAR
} from '../../../../lib/framework/bundler/constants';

export class BundlerEnvValues {
    public oldUnitTestEnvValue: string | undefined;
    public oldBuildEnvValue: string | undefined;
    public oldPreBuildEnvValue: string | undefined;
    public oldPostBuildEnvValue: string | undefined;
    public oldCleanupEnvValue: string | undefined;

    public backupEnv(): void {
        this.oldUnitTestEnvValue = process.env[SKIP_UNIT_TEST_VAR] ?? undefined;
        this.oldBuildEnvValue = process.env[SKIP_BUILD_VAR] ?? undefined;
        this.oldPreBuildEnvValue = process.env[SKIP_PRE_BUILD_VAR] ?? undefined;
        this.oldPostBuildEnvValue = process.env[SKIP_POST_BUILD_VAR] ?? undefined;
        this.oldCleanupEnvValue = process.env[SKIP_CLEAN_UP_VAR] ?? undefined;
    }

    public deleteEnvValues(): void {
        delete process.env[SKIP_UNIT_TEST_VAR];
        delete process.env[SKIP_BUILD_VAR];
        delete process.env[SKIP_PRE_BUILD_VAR];
        delete process.env[SKIP_POST_BUILD_VAR];
        delete process.env[SKIP_CLEAN_UP_VAR];
    }

    public restoreEnv() {
        process.env[SKIP_UNIT_TEST_VAR] = this.oldUnitTestEnvValue;
        process.env[SKIP_BUILD_VAR] = this.oldBuildEnvValue;
        process.env[SKIP_PRE_BUILD_VAR] = this.oldPreBuildEnvValue;
        process.env[SKIP_POST_BUILD_VAR] = this.oldPostBuildEnvValue;
        process.env[SKIP_CLEAN_UP_VAR] = this.oldCleanupEnvValue;
    }
}
