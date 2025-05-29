// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const cdk = jest.requireActual('aws-cdk-lib');

export const ModifiedApp = new Proxy(cdk.App, {
    construct(target, args, newTarget) {
        // Destructure args with default values
        const [props] = args;

        // Disable asset bundling
        return Reflect.construct(
            target,
            [{ ...props, context: { ...props?.context, 'aws:cdk:bundling-stacks': [] } }],
            newTarget
        );
    }
});

export const ModifiedStack = new Proxy(cdk.Stack, {
    construct(target, args, newTarget) {
        // Destructure args with default values
        const [scope, id, props] = args;

        // If no scope provided, create a new ModifiedApp.
        // This ensures that all Stacks are created with an App (and therefore use the Disabled Asset bundling context defined above)
        return Reflect.construct(target, [scope || new ModifiedApp(), id, props], newTarget);
    }
});
