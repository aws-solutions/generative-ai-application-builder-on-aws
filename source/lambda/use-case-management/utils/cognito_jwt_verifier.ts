// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoJwtPayload } from 'aws-jwt-verify/jwt-model';

export class TokenVerifier {
    private verifier: any;

    constructor(
        private readonly userPoolId: string,
        private readonly clientId: string
    ) {
        this.verifier = CognitoJwtVerifier.create({
            userPoolId: this.userPoolId,
            // Platform SaaS uses the Cognito ID token across UIs/APIs so we can access
            // custom attributes like `custom:tenant_id` and groups consistently.
            tokenUse: 'id',
            clientId: this.clientId
        });
    }

    /**
     * Verifies a JWT token and returns the decoded payload
     * @param token The JWT token to verify
     * @returns The decoded token payload
     * @throws Error if token is invalid or verification fails
     */
    async verifyToken(token: string): Promise<CognitoJwtPayload> {
        try {
            const payload = (await this.verifier.verify(token)) as CognitoJwtPayload;
            return payload;
        } catch (error) {
            console.error('Token verification failed:', error);
            throw new Error('Invalid token');
        }
    }
}
