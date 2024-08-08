/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

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
