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
/**
 * Cognito JWT verifier to validate incoming APIGateway websocket authorization request.
 * The CognitoJwtVerifier caches the JWKS file in memory and persists while the lambda is live.
 */
export declare const jwtVerifier: import("aws-jwt-verify/cognito-verifier").CognitoJwtVerifierSingleUserPool<{
    userPoolId: string;
    tokenUse: "access";
    clientId: string;
}>;
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
export declare const handler: (event: APIGatewayRequestAuthorizerEvent) => Promise<AuthResponse>;
