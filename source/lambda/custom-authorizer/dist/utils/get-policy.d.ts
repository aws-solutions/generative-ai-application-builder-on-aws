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
 **********************************************************************************************************************/
import { BatchGetCommandOutput } from '@aws-sdk/lib-dynamodb';
import { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import { AuthResponse } from 'aws-lambda';
/**
 * Function that generates a IAM policy that denies all requests.
 *
 * @returns Deny policy JSON
 */
export declare const denyAllPolicy: () => {
    principalId: string;
    policyDocument: {
        Version: string;
        Statement: {
            Action: string;
            Effect: string;
            Resource: string;
        }[];
    };
};
/**
 * Creates a policy composed of the policies returned for all groups the idToken belongs to.
 * This policy will allow the user access to any APIs that the groups they belong to have access to.
 *
 * @param idToken Decoded JWT Authorization token received in request header.
 * @returns
 */
export declare const getPolicyDocument: (idToken: CognitoAccessTokenPayload) => Promise<AuthResponse>;
/**
 * Will retrieve the policies for all the groups the provided token belongs to
 *
 * @param tableName
 * @param groups
 * @returns
 */
export declare const batchQueryDynamoDB: (tableName: string, groups: string[]) => Promise<BatchGetCommandOutput>;
