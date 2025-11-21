// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ValidatorResult } from 'jsonschema';

/**
 * Will check that the provided ValidatorResult is true, and throw back any validation errors that may have occurred.
 * This is a utility function for testing to make jest output more helpful
 *
 * @param result
 */
export function checkValidationSucceeded(result: ValidatorResult) {
    try {
        expect(result.valid).toBeTruthy();
    } catch (e) {
        console.log(result.errors);
        throw new Error(`JSON schema validation failed with errors: \n ${result.errors.map((e) => e).join('\n')}`);
    }
}

export function checkValidationFailed(result: ValidatorResult) {
    expect(result.valid).toBeFalsy();
}