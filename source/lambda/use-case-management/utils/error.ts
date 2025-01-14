// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export default class RequestValidationError extends Error {
    constructor(readonly message: string) {
        super(message);

        this.name = 'CustomHttpError';
    }
}
