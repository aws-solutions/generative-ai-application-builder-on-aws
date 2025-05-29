// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Mocks the cdk App creation to include 'aws:cdk:bundling-stacks': [] when running tests
// in order to avoid unecessarry bundling
jest.mock('aws-cdk-lib', () => {
    const actualModule = jest.requireActual('aws-cdk-lib');
    const { ModifiedApp, ModifiedStack } = jest.requireActual('./test/modifiedCdk');

    const modifiedModule = {
        ...actualModule,
        App: ModifiedApp,
        Stack: ModifiedStack
    };

    return modifiedModule;
});
