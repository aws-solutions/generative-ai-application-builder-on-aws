// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

module.exports = {
    modulePaths: ['<rootDir>/../layers/', '<rootDir>/../layers/aws-sdk-lib/node_modules/'],
    testMatch: ['**/*.test.ts'],
    setupFiles: ['./test/jest-environment-variables.ts'],
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
    collectCoverage: true,
    collectCoverageFrom: ['**/*.ts', '!**/test/*.ts', '!dist/'],
    coverageReporters: ['text', ['lcov', { projectRoot: '../../../' }]],
    preset: 'ts-jest'
};
