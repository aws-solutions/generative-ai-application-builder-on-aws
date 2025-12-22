// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, BatchGetCommandOutput, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';
import { AuthResponse } from 'aws-lambda';
import { AWSClientManager } from 'aws-sdk-lib';

/**
 * Function that generates a IAM policy that denies all requests.
 *
 * @returns Deny policy JSON
 */
export const denyAllPolicy = (): AuthResponse => {
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
export const getPolicyDocument = async (idToken: CognitoIdTokenPayload): Promise<AuthResponse> => {
    try {
        const groups = (idToken as any)['cognito:groups'] as string[] | undefined;
        if (groups) {
            const tableName = process.env.COGNITO_POLICY_TABLE_NAME!;
            const results = await batchQueryDynamoDB(tableName, groups);

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
                        // Authorizer context values must be primitive types (string/number/bool).
                        UserId: idToken.sub,
                        TenantId: ((idToken as any)['custom:tenant_id'] as string | undefined) ?? '',
                        Groups: JSON.stringify(groups ?? []),
                        Email: ((idToken as any).email as string | undefined) ?? ''
                    }
                };
            }
        } else {
            console.error('No cognito groups found in provided token');
        }
    } catch (error) {
        console.error(`Error while retrieving policies: ${error}`);
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
    const ddbClient = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb');
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
