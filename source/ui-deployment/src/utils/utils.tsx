// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Auth } from 'aws-amplify';

/**
 * Use currently authenticated user to generate a JWT token from
 * Cognito.
 * @returns JWT Token
 */
export async function generateToken() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const token = user.getSignInUserSession().getAccessToken().getJwtToken();
        return token;
    } catch (error) {
        console.error('error REST API:', error);
    }
}
