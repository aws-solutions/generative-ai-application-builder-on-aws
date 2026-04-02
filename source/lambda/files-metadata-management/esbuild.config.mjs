// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outdir: 'dist',
    // Enable import condition so esbuild can resolve ESM-only packages like file-type
    conditions: ['import', 'node'],
    // Mark layer-provided packages as external so they're not bundled
    external: [
        'aws-sdk-lib',
        'aws-node-user-agent-config',
        '@aws-sdk/*',
        '@aws-lambda-powertools/*',
        '@middy/*',
        '@smithy/*',
        'aws-lambda'
    ]
});
