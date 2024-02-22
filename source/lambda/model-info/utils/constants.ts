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

export const MODEL_INFO_TABLE_NAME_ENV_VAR = 'MODEL_INFO_TABLE_NAME';

export const REQUIRED_ENV_VARS = [MODEL_INFO_TABLE_NAME_ENV_VAR];

export enum ModelInfoTableKeys {
    MODEL_INFO_TABLE_PARTITION_KEY = 'UseCase',
    MODEL_INFO_TABLE_SORT_KEY = 'SortKey',
    MODEL_INFO_TABLE_PROVIDER_NAME_KEY = 'ModelProviderName',
    MODEL_INFO_TABLE_MODEL_NAME_KEY = 'ModelName'
}
