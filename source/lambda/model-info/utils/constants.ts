#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const MODEL_INFO_TABLE_NAME_ENV_VAR = 'MODEL_INFO_TABLE_NAME';

export const REQUIRED_ENV_VARS = [MODEL_INFO_TABLE_NAME_ENV_VAR];

export enum ModelInfoTableKeys {
    MODEL_INFO_TABLE_PARTITION_KEY = 'UseCase',
    MODEL_INFO_TABLE_SORT_KEY = 'SortKey',
    MODEL_INFO_TABLE_PROVIDER_NAME_KEY = 'ModelProviderName',
    MODEL_INFO_TABLE_MODEL_NAME_KEY = 'ModelName'
}
