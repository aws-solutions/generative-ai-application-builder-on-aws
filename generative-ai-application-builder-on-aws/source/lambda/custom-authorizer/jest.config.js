/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      		  *
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

module.exports = {
    modulePaths: [
        '<rootDir>/../layers/',
        '<rootDir>/../layers/aws-sdk-lib/node_modules/',
        '<rootDir>/../layers/common-node-lib/'
    ],
    testMatch: ['test/**/*.[t]s?(x)', '**/?(*.)+(spec|test).[t]s?(x)'],
    setupFiles: ['./test/jest-environment-variables.ts'],
    collectCoverage: true,
    collectCoverageFrom: ['**/*.ts', '!**/test/*.ts', '!dist/'],
    coverageReporters: ['text', ['lcov', { projectRoot: '../../../' }]],
    preset: 'ts-jest'
};
