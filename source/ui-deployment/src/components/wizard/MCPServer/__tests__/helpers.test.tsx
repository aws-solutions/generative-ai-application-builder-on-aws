// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect } from 'vitest';
import { validateKeyValuePair, validateKey, validateValue, isEcrUriValid } from '../helpers';

describe('helpers', () => {
    describe('validateKeyValuePair', () => {
        const mockKeyValidator = (key: string) => (key.length > 10 ? 'Key too long' : '');
        const mockValueValidator = (value: string) => (value.length > 10 ? 'Value too long' : '');

        test('returns no errors for valid key-value pair', () => {
            const result = validateKeyValuePair(
                { key: 'validKey', value: 'validValue' },
                mockKeyValidator,
                mockValueValidator
            );
            expect(result.keyError).toBe('');
            expect(result.valueError).toBe('');
        });

        test('returns no errors for empty key-value pair (optional field)', () => {
            const result = validateKeyValuePair({ key: '', value: '' }, mockKeyValidator, mockValueValidator);
            expect(result.keyError).toBe('');
            expect(result.valueError).toBe('');
        });

        test('requires value when key is provided', () => {
            const result = validateKeyValuePair({ key: 'hasKey', value: '' }, mockKeyValidator, mockValueValidator);
            expect(result.keyError).toBe('');
            expect(result.valueError).toBe('Value is required when key is provided');
        });

        test('requires key when value is provided', () => {
            const result = validateKeyValuePair({ key: '', value: 'hasValue' }, mockKeyValidator, mockValueValidator);
            expect(result.keyError).toBe('Key is required when value is provided');
            expect(result.valueError).toBe('');
        });

        test('returns validator errors along with completeness errors', () => {
            const result = validateKeyValuePair(
                { key: 'thisKeyIsTooLong', value: '' },
                mockKeyValidator,
                mockValueValidator
            );
            expect(result.keyError).toBe('Key too long');
            expect(result.valueError).toBe('Value is required when key is provided');
        });
    });

    describe('validateKey', () => {
        test('returns empty string for valid keys', () => {
            expect(validateKey('MY_VAR')).toBe('');
            expect(validateKey('_PRIVATE_VAR')).toBe('');
            expect(validateKey('PATH')).toBe('');
            expect(validateKey('VAR_123')).toBe('');
            expect(validateKey('')).toBe(''); // Optional field
        });

        test('returns error for invalid keys', () => {
            expect(validateKey('123_VAR')).toContain('must start with a letter or underscore');
            expect(validateKey('MY-VAR')).toContain('must start with a letter or underscore');
            expect(validateKey('MY VAR')).toContain('must start with a letter or underscore');
        });
    });

    describe('validateValue', () => {
        test('returns empty string for any value', () => {
            expect(validateValue('any value')).toBe('');
            expect(validateValue('')).toBe('');
            expect(validateValue('123')).toBe('');
            expect(validateValue('special!@#$%^&*()')).toBe('');
        });
    });

    describe('validateKeyValuePair with common validators', () => {
        test('validates key format and completeness together', () => {
            const result = validateKeyValuePair({ key: '123_INVALID', value: '' }, validateKey, validateValue);
            expect(result.keyError).toContain('must start with a letter or underscore');
            expect(result.valueError).toBe('Value is required when key is provided');
        });

        test('uses default validators when none provided', () => {
            const result = validateKeyValuePair({ key: 'MY_VAR', value: 'my_value' });
            expect(result.keyError).toBe('');
            expect(result.valueError).toBe('');
        });
    });

    describe('isEcrUriValid', () => {
        describe('valid ECR URIs', () => {
            test('accepts standard ECR URI format', () => {
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest')).toBe(true);
            });

            test('accepts ECR URI with namespace', () => {
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/awslabs/dynamodb-mcp-server:latest')).toBe(true);
            });

            test('accepts ECR URI with underscores and hyphens', () => {
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/bedrock_agentcore-agent:latest')).toBe(true);
            });
        });

        describe('invalid ECR URIs', () => {
            test('rejects URIs with spaces', () => {
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/my repo:latest')).toBe(false);
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:my tag')).toBe(false);
                expect(isEcrUriValid(' 123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:latest')).toBe(false);
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:latest ')).toBe(false);
            });

            test('rejects URIs with special characters', () => {
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/repo@name:latest')).toBe(false);
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/repo#name:latest')).toBe(false);
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/repo%name:latest')).toBe(false);
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/repo+name:latest')).toBe(false);
            });

            test('rejects very long repository names', () => {
                const longRepo = 'a'.repeat(500);
                expect(isEcrUriValid(`123456789012.dkr.ecr.us-east-1.amazonaws.com/${longRepo}:latest`)).toBe(false);
            });

            test('rejects very long tags', () => {
                const longTag = 'a'.repeat(400);
                expect(isEcrUriValid(`123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:${longTag}`)).toBe(false);
            });

            test('rejects malformed URIs', () => {
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com//repo:latest')).toBe(false);
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/../repo:latest')).toBe(false);
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/./repo:latest')).toBe(false);
            });

            test('rejects uppercase in repository names', () => {
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/MyRepo:latest')).toBe(false);
                expect(isEcrUriValid('123456789012.dkr.ecr.us-east-1.amazonaws.com/REPO:latest')).toBe(false);
            });
        });
    });
});
