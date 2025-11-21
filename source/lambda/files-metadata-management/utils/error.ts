// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Custom error class for request validation errors
 */
export default class RequestValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CustomHttpError';
    }
}
