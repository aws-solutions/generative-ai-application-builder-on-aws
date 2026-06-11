// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Respect WORKERS_PER_SUITE env var to limit Jest worker parallelism in CI.
// When many suites run concurrently, each spawning maxWorkers causes OOM.
const workersPerSuite = process.env.WORKERS_PER_SUITE ? parseInt(process.env.WORKERS_PER_SUITE, 10) : 0;

module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    testMatch: ['**/*.test.ts'],
    collectCoverage: true,
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    coverageReporters: ['text', ['lcov', { projectRoot: '../../' }]],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    // Limit worker processes when WORKERS_PER_SUITE is set (CI parallel mode)
    ...(workersPerSuite > 0 && { maxWorkers: workersPerSuite })
};
