// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { TokenVerifier } from '../../utils/cognito_jwt_verifier';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Mock the aws-jwt-verify module
jest.mock('aws-jwt-verify', () => ({
    CognitoJwtVerifier: {
        create: jest.fn().mockReturnValue({
            verify: jest.fn()
        })
    }
}));

describe('TokenVerifier', () => {
    const mockUserPoolId = 'us-east-1_testpool';
    const mockClientId = 'testclientid';
    const mockToken = 'mock.jwt.token';

    let tokenVerifier: TokenVerifier;
    let mockVerify: jest.Mock;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        tokenVerifier = new TokenVerifier(mockUserPoolId, mockClientId);
        mockVerify = CognitoJwtVerifier.create({} as any).verify as jest.Mock;
    });

    it('should create verifier with correct configuration', () => {
        expect(CognitoJwtVerifier.create).toHaveBeenCalledWith({
            userPoolId: mockUserPoolId,
            tokenUse: 'id',
            clientId: mockClientId
        });
    });

    it('should successfully verify a valid token', async () => {
        const mockPayload = {
            sub: 'user123',
            'cognito:groups': ['admin'],
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        };

        mockVerify.mockResolvedValueOnce(mockPayload);

        const result = await tokenVerifier.verifyToken(mockToken);

        expect(mockVerify).toHaveBeenCalledWith(mockToken);
        expect(result).toEqual(mockPayload);
    });

    it('should throw error when token verification fails', async () => {
        mockVerify.mockRejectedValueOnce(new Error('Invalid token'));

        await expect(tokenVerifier.verifyToken(mockToken)).rejects.toThrow('Invalid token');

        expect(mockVerify).toHaveBeenCalledWith(mockToken);
    });
});
