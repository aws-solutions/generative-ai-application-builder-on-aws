// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    testMatch: ['**/*.test.ts'],
    collectCoverage: true,
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    coverageReporters: ['text', ['lcov', { projectRoot: '../../' }]]
};
