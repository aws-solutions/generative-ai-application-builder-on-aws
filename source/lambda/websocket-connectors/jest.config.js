// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

module.exports = {
    modulePaths: [
        '<rootDir>/../layers/',
        '<rootDir>/../layers/aws-sdk-lib/node_modules/',
        '<rootDir>/../layers/aws-node-user-agent-config/',
        '<rootDir>/../layers/aws-node-user-agent-config/node_modules/'
    ],
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
    testMatch: ['**/*.test.ts'],
    collectCoverage: true,
    collectCoverageFrom: ['**/*.ts', '!**/test/*.ts', '!dist/'],
    coverageReporters: ['text', ['lcov', { projectRoot: '../../../' }]],
    preset: 'ts-jest',
    testEnvironment: 'node'
};
