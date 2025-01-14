#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { LANGCHAIN_LAMBDA_PYTHON_RUNTIME } from '../../utils/constants';

// asset bundler stages related constants
export const SKIP_PRE_BUILD_VAR = 'SKIP_PRE_BUILD';
export const SKIP_BUILD_VAR = 'SKIP_BUILD';
export const SKIP_UNIT_TEST_VAR = 'SKIP_UNIT_TEST';
export const SKIP_POST_BUILD_VAR = 'SKIP_POST_BUILD';
export const SKIP_CLEAN_UP_VAR = 'SKIP_CLEAN_UP';

// cdk context flag constants
export const PRE_BUILD_FLAG = '@custom-bundler/pre-build';
export const BUILD_FLAG = '@custom-bundler/build';
export const UNIT_TEST_FLAG = '@custom-bundler/unit-test';
export const POST_BUILD_FLAG = '@custom-bundler/post-build';
export const CLEAN_UP_FLAG = '@custom-bundler/clean-up';

// Build template stages
export const PRE_BUILD_STAGE_VAR = 'pre-build';
export const POST_BUILD_STAGE_VAR = 'post-build';
export const BUILD_STAGE_VAR = 'build';
export const UNIT_TEST_STAGE_VAR = 'unit-test';
export const CLEAN_UP_STAGE_VAR = 'clean-up';

// tokens in build template definition for replacement
export const MODULE_NAME_TOKEN = '%%MODULE_NAME%%';
export const OUTPUT_DIR_TOKEN = '%%OUTPUT_DIR%%';

// cdk context build spec
export const CDK_PYTHON_BUNDLER = '@custom-bundler/python';
export const LOCAL_BUILD_VAR = 'local';
export const DOCKER_BUILD_VAR = 'docker';

// additional arguments for pip options
export const PYTHON_PIP_BUILD_PLATFORM: string = 'manylinux2014_x86_64';
export const PYTHON_PIP_WHEEL_IMPLEMENTATION: string = 'cp';
export const PYTHON_VERSION: string = LANGCHAIN_LAMBDA_PYTHON_RUNTIME.name.replace('python', '');

export const REACTJS_ASSET_BUNDLER = 'ReactjsAssetBundler';
