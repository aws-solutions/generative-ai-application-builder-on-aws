// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthResponse, APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { AWSClientManager } from 'aws-sdk-lib';
import { denyAllPolicy, getPolicyDocument } from './utils/get-policy';
import { matchArnWithValidation } from './utils/match-policy';
import {
    CognitoIdentityProviderClient,
    DescribeUserPoolClientCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { jwtDecode } from 'jwt-decode';

const cognitoClient = AWSClientManager.getServiceClient<CognitoIdentityProviderClient>('cognito');

/**
 * Cognito JWT verifier to validate incoming APIGateway websocket authorization request.
 * The CognitoJwtVerifier caches the JWKS file in memory and persists while the lambda is live.
 */
export const jwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID!,
    // Platform SaaS needs tenant info which is exposed via Cognito custom attributes in the *ID token*.
    tokenUse: 'id'
});

/**
 * Lambda function to validate incoming APIGateway websocket authorization request.
 * The authorization token is expected to be in the 'Authorization' header.
 * It is expected to be a JWT ID token generted by AWS Cognito, and will be validated using the
 * `aws-jwt-verify` library.
 *
 * The function will return a policy with the effect 'Allow' if the token is valid, and 'Deny' otherwise.
 *
 * @param event Request authorization event received from APIGateway websocket api
 * @param context Lambda event context
 * @returns Object containing `principalId`, `policyDocument` and optionally `context` and `usageIdentifierKey`
 */
export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<AuthResponse> => {
    try {
        const methodArn = event.methodArn;
        // API Gateway may normalize header keys to lowercase.
        const encodedToken = event.headers?.Authorization ?? (event.headers as any)?.authorization;
        if (!encodedToken) {
            throw new Error('Authorization header value is missing');
        }
        const encodedTokenWithoutBearer = encodedToken.replace(/^Bearer\s+/i, '');

        const decodedToken = jwtDecode<any>(encodedTokenWithoutBearer);

        const clientId = decodedToken.aud ?? decodedToken.client_id;

        try {
            await cognitoClient.send(
                new DescribeUserPoolClientCommand({
                    UserPoolId: process.env.USER_POOL_ID,
                    ClientId: clientId
                })
            );
        } catch (error) {
            console.error('Client validation failed:', error);
            throw new Error('Invalid client id');
        }

        const decodedTokenPayload = await jwtVerifier.verify(encodedTokenWithoutBearer, {
            clientId: clientId
        });

        const policyDocument = await getPolicyDocument(decodedTokenPayload);
        const matchedStatements = []
        for (const statement of policyDocument.policyDocument.Statement) {
            const statementWithResource = statement as any
            
            for (const resource of statementWithResource.Resource) {
                if(matchArnWithValidation(methodArn, resource)) {
                    matchedStatements.push(statementWithResource);
                    break;
                }
            }
        }
        if(matchedStatements.length > 0) {
            policyDocument.policyDocument.Statement = matchedStatements;
            return policyDocument;
        }
        return denyAllPolicy();

    } catch (error: any) {
        console.error(error.message);
        // apigateway needs this exact error so it returns a 401 response instead of a 500
        throw new Error('Unauthorized');
    }
};
