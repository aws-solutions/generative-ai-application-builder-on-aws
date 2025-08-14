// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { matchArnWithValidation, matchComponent } from '../utils/match-policy';

describe('ARN Matcher Tests - API Gateway Focus', () => {
    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0084/v2.1.0" }`;
    });

    describe('matchComponent - API Gateway patterns', () => {
        it('should match exact API Gateway resource strings', () => {
            expect(matchComponent('sdd5uei6d2/prod/*/*', 'sdd5uei6d2/prod/*/*')).toBe(true);
            expect(matchComponent('api123/dev/GET/users', 'api123/dev/GET/users')).toBe(true);
            expect(matchComponent('api123/dev/GET/users', 'different/dev/GET/users')).toBe(false);
        });

        it('should match API Gateway wildcard patterns', () => {
            expect(matchComponent('sdd5uei6d2/prod/GET/users', 'sdd5uei6d2/prod/*/*')).toBe(true);
            expect(matchComponent('api123/dev/POST/orders', 'api123/*/POST/*')).toBe(true);
            expect(matchComponent('any-api-id/any-stage/any-method/any-resource', '*')).toBe(true);
        });

        it('should match API Gateway partial wildcard patterns', () => {
            expect(matchComponent('sdd5uei6d2/prod/GET/users', 'sdd5uei6d2/prod/*')).toBe(true);
            expect(matchComponent('api123/dev/GET/users/profile', 'api123/dev/GET/users/*')).toBe(true);
            expect(matchComponent('xyz789/staging/POST/orders', '*/staging/POST/*')).toBe(true);
            expect(matchComponent('api123/prod/GET/users', 'api123/dev/*')).toBe(false);
        });

        it('should handle API Gateway method wildcards', () => {
            expect(matchComponent('api123/prod/GET/users', 'api123/prod/*/users')).toBe(true);
            expect(matchComponent('api123/prod/POST/users', 'api123/prod/*/users')).toBe(true);
            expect(matchComponent('api123/prod/DELETE/users', 'api123/prod/*/users')).toBe(true);
        });

        it('should throw on invalid regexes', () => {
            expect(() => matchComponent('api123/prod/DELETE/users', '[^')).toThrow();
        });
    });

    describe('matchArnWithValidation - API Gateway ARNs', () => {
        it('should match identical API Gateway ARNs', () => {
            const arn = 'arn:aws:execute-api:ap-southeast-1:123456789012:sdd5uei6d2/prod/*/*';
            expect(matchArnWithValidation(arn, arn)).toBe(true);
        });

        it('should match API Gateway ARNs with wildcards', () => {
            const arn = 'arn:aws:execute-api:ap-southeast-1:123456789012:sdd5uei6d2/prod/GET/users';
            const patterns = [
                'arn:aws:execute-api:ap-southeast-1:123456789012:sdd5uei6d2/prod/*/*',
                'arn:aws:execute-api:ap-southeast-1:123456789012:sdd5uei6d2/*/*',
                'arn:aws:execute-api:ap-southeast-1:123456789012:*',
                'arn:aws:execute-api:*:123456789012:sdd5uei6d2/prod/GET/users',
                'arn:*:execute-api:ap-southeast-1:123456789012:sdd5uei6d2/prod/GET/users'
            ];

            patterns.forEach(pattern => {
                expect(matchArnWithValidation(arn, pattern)).toBe(true);
            });
        });

        it('should return false for invalid patterns', () => {
            const arn = 'arn:aws:execute-api:ap-southeast-1:123456789012:sdd5uei6d2/prod/GET/users';
            const patterns = [
                '[arn:aws:execute-api:ap-southeast-1:123456789012:sdd5uei6d2/prod/*/*',
            ];

            patterns.forEach(pattern => {
                expect(matchArnWithValidation(arn, pattern)).toBe(false);
            });
        });

        it('should not match different API Gateway APIs', () => {
            const arn = 'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/users';
            const pattern = 'arn:aws:execute-api:us-east-1:123456789012:different-api/prod/GET/users';
            
            expect(matchArnWithValidation(arn, pattern)).toBe(false);
        });

        it('should not match different regions', () => {
            const arn = 'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/users';
            const pattern = 'arn:aws:execute-api:us-west-2:123456789012:api123/prod/GET/users';
            
            expect(matchArnWithValidation(arn, pattern)).toBe(false);
        });

        it('should not match different account IDs', () => {
            const arn = 'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/users';
            const pattern = 'arn:aws:execute-api:us-east-1:987654321098:api123/prod/GET/users';
            
            expect(matchArnWithValidation(arn, pattern)).toBe(false);
        });

        it('should match API Gateway stage wildcards', () => {
            const arn = 'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/users';
            const patterns = [
                'arn:aws:execute-api:us-east-1:123456789012:api123/*/GET/users',
                'arn:aws:execute-api:us-east-1:123456789012:api123/prod/*/users',
                'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/*'
            ];

            patterns.forEach(pattern => {
                expect(matchArnWithValidation(arn, pattern)).toBe(true);
            });
        });

        it('should not match when stages differ', () => {
            const arn = 'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/users';
            const patterns = [
                'arn:aws:execute-api:us-east-1:123456789012:api123/dev/GET/users',
                'arn:aws:execute-api:us-east-1:123456789012:api123/staging/GET/users',
                'arn:aws:execute-api:us-east-1:123456789012:api123/test/GET/users'
            ];

            patterns.forEach(pattern => {
                expect(matchArnWithValidation(arn, pattern)).toBe(false);
            });
        });

        it('should handle invalid API Gateway ARNs gracefully', () => {
            const validArn = 'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/users';
            const invalidPattern = 'invalid-arn-pattern';
            
            expect(matchArnWithValidation(validArn, invalidPattern)).toBe(false);
            expect(matchArnWithValidation(invalidPattern, validArn)).toBe(false);
            expect(matchArnWithValidation(invalidPattern, invalidPattern)).toBe(false);
        });

        it('should match complex API Gateway resource patterns', () => {
            const arn = 'arn:aws:execute-api:us-east-1:123456789012:api123/v1/GET/users/profile/settings';
            const patterns = [
                'arn:aws:execute-api:us-east-1:123456789012:api123/v1/GET/users/*',
                'arn:aws:execute-api:us-east-1:123456789012:api123/v1/*/users/profile/settings',
                'arn:aws:execute-api:us-east-1:123456789012:api123/v1/*/*',
                'arn:aws:execute-api:us-east-1:123456789012:api123/*/GET/users/profile/*'
            ];

            patterns.forEach(pattern => {
                expect(matchArnWithValidation(arn, pattern)).toBe(true);
            });
        });

        it('should not match when resource paths differ', () => {
            const arn = 'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/users';
            const patterns = [
                'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/orders',
                'arn:aws:execute-api:us-east-1:123456789012:api123/prod/POST/users',
                'arn:aws:execute-api:us-east-1:123456789012:api123/prod/GET/users/different'
            ];

            patterns.forEach(pattern => {
                expect(matchArnWithValidation(arn, pattern)).toBe(false);
            });
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

