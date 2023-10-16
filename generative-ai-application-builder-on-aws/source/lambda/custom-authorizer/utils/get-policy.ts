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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, BatchGetCommandOutput, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import { AuthResponse } from 'aws-lambda';
import { customAwsConfig } from 'aws-node-user-agent-config';

/**
 * Function that generates a IAM policy that denies all requests.
 *
 * @returns Deny policy JSON
 */
export const denyAllPolicy = () => {
    return {
        principalId: '*',
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: '*',
                    Effect: 'Deny',
                    Resource: '*'
                }
            ]
        }
    };
};

/**
 * Creates a policy composed of the policies returned for all groups the idToken belongs to.
 * This policy will allow the user access to any APIs that the groups they belong to have access to.
 *
 * @param idToken Decoded JWT Authorization token received in request header.
 * @returns
 */
export const getPolicyDocument = async (idToken: CognitoAccessTokenPayload): Promise<AuthResponse> => {
    const groups = idToken['cognito:groups'];
    const tableName = process.env.COGNITO_POLICY_TABLE_NAME!;
    const results = await batchQueryDynamoDB(tableName, groups!); // NOSONAR typescript:S4325 - removing the assertion causes compilation failure
    console.debug(`Received results from DynamoDB: ${JSON.stringify(results)}`);

    if (results.Responses && results.Responses[tableName] && results.Responses[tableName].length > 0) {
        let statements = [];
        for (const resultPolicy of results.Responses[tableName]) {
            try {
                statements.push(...resultPolicy.policy.Statement);
            } catch (error) {
                console.warn(`Error parsing policy ${resultPolicy}. Got error: ${error}. Skipping.`);
            }
        }
        return {
            principalId: '*',
            policyDocument: {
                'Version': results.Responses[tableName][0].policy.Version,
                'Statement': statements
            },
            context: {
                UserId: idToken.sub
            }
        };
    }
    return denyAllPolicy();
};

/**
 * Will retrieve the policies for all the groups the provided token belongs to
 *
 * @param tableName
 * @param groups
 * @returns
 */
export const batchQueryDynamoDB = async (tableName: string, groups: string[]): Promise<BatchGetCommandOutput> => {
    const ddbClient = new DynamoDBClient(customAwsConfig());
    const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

    const result = await ddbDocClient.send(
        new BatchGetCommand({
            RequestItems: {
                [tableName]: {
                    Keys: groups.map((groupName) => {
                        return { group: groupName };
                    })
                }
            }
        })
    );

    return result;
};
