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

import { AuthResponse, APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { getPolicyDocument } from './utils/get-policy';

/**
 * Cognito JWT verifier to validate incoming APIGateway websocket authorization request.
 * The CognitoJwtVerifier caches the JWKS file in memory and persists while the lambda is live.
 */
export const jwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID!,
    tokenUse: 'access',
    clientId: process.env.CLIENT_ID!
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
 * @param context Lamdba event context
 * @returns Object containing `principalId`, `policyDocument` and optionally `context` and `usageIdentifierKey`
 */
export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<AuthResponse> => {
    try {
        const encodedToken = event.queryStringParameters?.Authorization;
        if (!encodedToken) {
            throw new Error('Authorization query string parameter is missing');
        }

        const decodedTokenPayload = await jwtVerifier.verify(encodedToken, {
            clientId: process.env.CLIENT_ID!
        });

        return getPolicyDocument(decodedTokenPayload);
    } catch (error: any) {
        console.error(error.message);
        // apigateway needs this exact error so it returns a 401 response instead of a 500
        throw new Error('Unauthorized');
    }
};
