// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import {
    parseEventBody,
    handleLambdaError,
    extractUserId,
    generateUUID,
    getRetrySettings,
    checkEnv,
    isValidArnWithRegexKey
} from '../../utils/utils';
import RequestValidationError from '../../utils/error';
import { MAX_INPUT_PAYLOAD_SIZE, REQUIRED_ENV_VARS, REQUIRED_MCP_ENV_VARS } from '../../utils/constants';

jest.mock('../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    tracer: {
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id'),
        captureMethod: () => () => {},
        captureAWSv3Client: jest.fn()
    }
}));

jest.mock('../../utils/http-response-formatters', () => ({
    formatError: jest.fn().mockReturnValue({
        statusCode: 500,
        body: JSON.stringify({ message: 'Error' })
    })
}));

const createMockEvent = (body: string | null): APIGatewayEvent => ({
    body,
    httpMethod: 'POST',
    resource: '/test',
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/test',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
        accountId: 'test-account',
        apiId: 'test-api',
        authorizer: {},
        httpMethod: 'POST',
        identity: {} as any,
        path: '/test',
        protocol: 'HTTP/1.1',
        requestId: 'test-request-id',
        requestTime: '01/Jan/2023:00:00:00 +0000',
        requestTimeEpoch: 1672531200,
        resourceId: 'test-resource',
        resourcePath: '/test',
        stage: 'test'
    }
});

describe('Utils Functions', () => {
    describe('parseEventBody', () => {
        it('should parse valid JSON object', () => {
            const event = createMockEvent('{"key": "value"}');
            const result = parseEventBody(event);
            expect(result).toEqual({ key: 'value' });
        });

        it('should handle empty body with default empty object', () => {
            const event = createMockEvent(null);
            const result = parseEventBody(event);
            expect(result).toEqual({});
        });

        it('should handle empty string body', () => {
            const event = createMockEvent('');
            const result = parseEventBody(event);
            expect(result).toEqual({});
        });

        it('should throw error for invalid JSON', () => {
            const event = createMockEvent('invalid json');
            expect(() => parseEventBody(event)).toThrow(RequestValidationError);
            expect(() => parseEventBody(event)).toThrow('Invalid JSON in request body');
        });

        it('should throw error for primitive values', () => {
            const event = createMockEvent('"string"');
            expect(() => parseEventBody(event)).toThrow(RequestValidationError);
            expect(() => parseEventBody(event)).toThrow('Invalid request format');
        });

        it('should throw error for null values', () => {
            const event = createMockEvent('null');
            expect(() => parseEventBody(event)).toThrow(RequestValidationError);
            expect(() => parseEventBody(event)).toThrow('Invalid request format');
        });

        it('should throw error for array values', () => {
            const event = createMockEvent('[1, 2, 3]');
            expect(() => parseEventBody(event)).toThrow(RequestValidationError);
            expect(() => parseEventBody(event)).toThrow('Invalid request format');
        });

        it('should throw error for payload too large', () => {
            const largePayload = '{"data": "' + 'x'.repeat(MAX_INPUT_PAYLOAD_SIZE) + '"}';
            const event = createMockEvent(largePayload);
            expect(() => parseEventBody(event)).toThrow(RequestValidationError);
            expect(() => parseEventBody(event)).toThrow('Request body exceeds maximum allowed size');
        });

        it('should accept valid nested objects', () => {
            const event = createMockEvent('{"user": {"name": "test", "age": 30}}');
            const result = parseEventBody(event);
            expect(result).toEqual({ user: { name: 'test', age: 30 } });
        });
    });

    describe('extractUserId', () => {
        it('should extract user ID from event context', () => {
            const event = createMockEvent('{}');
            event.requestContext.authorizer = { UserId: 'test-user-123' };

            const result = extractUserId(event);
            expect(result).toBe('test-user-123');
        });

        it('should throw error when authorizer context is missing', () => {
            const event = createMockEvent('{}');
            event.requestContext.authorizer = undefined;

            expect(() => extractUserId(event)).toThrow('Missing authorizer context in API Gateway event');
        });

        it('should throw error when UserId is missing', () => {
            const event = createMockEvent('{}');
            event.requestContext.authorizer = {};

            expect(() => extractUserId(event)).toThrow('Missing UserId in authorizer context');
        });

        it('should throw error when UserId is empty string', () => {
            const event = createMockEvent('{}');
            event.requestContext.authorizer = { UserId: '' };

            expect(() => extractUserId(event)).toThrow('Missing UserId in authorizer context');
        });
    });

    describe('generateUUID', () => {
        it('should generate a valid UUID with default parameter (false)', () => {
            const uuid = generateUUID();
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('should generate a valid UUID when explicitly passed false', () => {
            const uuid = generateUUID(false);
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('should generate a short UUID when requested', () => {
            const shortUuid = generateUUID(true);
            expect(shortUuid).toMatch(/^[0-9a-f]{8}$/i);
        });
    });

    describe('getRetrySettings', () => {
        it('should return default retry settings', () => {
            const settings = getRetrySettings();
            expect(settings).toHaveProperty('maxRetries');
            expect(settings).toHaveProperty('backOffRate');
            expect(settings).toHaveProperty('initialDelayMs');
            expect(typeof settings.maxRetries).toBe('number');
            expect(typeof settings.backOffRate).toBe('number');
            expect(typeof settings.initialDelayMs).toBe('number');
        });
    });

    describe('handleLambdaError', () => {
        it('should handle RequestValidationError', () => {
            const error = new RequestValidationError('Test validation error');
            const result = handleLambdaError(error, 'testAction', 'TestContext');

            expect(result).toBeDefined();
            expect(result.statusCode).toBe(500);
        });

        it('should handle generic errors', () => {
            const error = new Error('Generic error');
            const result = handleLambdaError(error, 'testAction');

            expect(result).toBeDefined();
            expect(result.statusCode).toBe(500);
        });
    });

    describe('checkEnv', () => {
        it('should handle empty array of required variables', () => {
            expect(() => {
                checkEnv([]);
            }).not.toThrow();
        });

        it('should handle custom list of required variables', () => {
            process.env.CUSTOM_VAR1 = 'value';
            process.env.CUSTOM_VAR2 = 'value';

            expect(() => {
                checkEnv(['CUSTOM_VAR1', 'CUSTOM_VAR2']);
            }).not.toThrow();

            expect(() => {
                checkEnv(['CUSTOM_VAR1', 'MISSING_VAR']);
            }).toThrow(
                'Missing required environment variables: MISSING_VAR. This should not happen and indicates an issue with your deployment.'
            );
        });
    });

    describe('isValidArnWithRegexKey', () => {
        describe('Valid ARNs', () => {
            it('should validate bedrock-agentcore-identity-OAUTH ARNs', () => {
                const validOAuthArn = 'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/my-vault/oauth2credentialprovider/my-provider';
                expect(isValidArnWithRegexKey(validOAuthArn, 'bedrock-agentcore', 'bedrock-agentcore-identity-OAUTH')).toBe(true);
            });

            it('should validate bedrock-agentcore-identity-API_KEY ARNs', () => {
                const validApiKeyArn = 'arn:aws:bedrock-agentcore:us-west-2:123456789012:token-vault/test-vault/apikeycredentialprovider/test-provider';
                expect(isValidArnWithRegexKey(validApiKeyArn, 'bedrock-agentcore', 'bedrock-agentcore-identity-API_KEY')).toBe(true);
            });

            it('should validate bedrock-agentcore-gateway ARNs', () => {
                const validGatewayArn = 'arn:aws:bedrock-agentcore:eu-west-1:123456789012:gateway/my-gateway-123';
                expect(isValidArnWithRegexKey(validGatewayArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(true);
            });

            it('should validate lambda ARNs', () => {
                const validLambdaArn = 'arn:aws:lambda:us-east-1:123456789012:function:my-function';
                expect(isValidArnWithRegexKey(validLambdaArn, 'lambda', 'lambda')).toBe(true);

                const validLambdaArnWithVersion = 'arn:aws:lambda:us-east-1:123456789012:function:my-function:1';
                expect(isValidArnWithRegexKey(validLambdaArnWithVersion, 'lambda', 'lambda')).toBe(true);
            });
        });

        describe('Invalid ARN format', () => {
            it('should reject invalid ARN format', () => {
                const invalidArn = 'not-an-arn';
                expect(isValidArnWithRegexKey(invalidArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });

            it('should reject malformed ARN', () => {
                const malformedArn = 'arn:aws:bedrock-agentcore';
                expect(isValidArnWithRegexKey(malformedArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });

            it('should reject ARN with invalid characters', () => {
                const invalidArn = 'arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/invalid@gateway';
                expect(isValidArnWithRegexKey(invalidArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });
        });

        describe('Wrong service validation', () => {
            it('should reject ARNs with wrong service', () => {
                const wrongServiceArn = 'arn:aws:s3:us-east-1:123456789012:gateway/my-gateway';
                expect(isValidArnWithRegexKey(wrongServiceArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });

            it('should reject lambda ARN when expecting bedrock-agentcore', () => {
                const lambdaArn = 'arn:aws:lambda:us-east-1:123456789012:function:my-function';
                expect(isValidArnWithRegexKey(lambdaArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });
        });

        describe('Invalid region/account validation', () => {
            it('should reject ARNs with missing region', () => {
                const noRegionArn = 'arn:aws:bedrock-agentcore::123456789012:gateway/my-gateway';
                expect(isValidArnWithRegexKey(noRegionArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });

            it('should reject ARNs with invalid account ID', () => {
                const invalidAccountArn = 'arn:aws:bedrock-agentcore:us-east-1:invalid-account:gateway/my-gateway';
                expect(isValidArnWithRegexKey(invalidAccountArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });

            it('should reject ARNs with short account ID', () => {
                const shortAccountArn = 'arn:aws:bedrock-agentcore:us-east-1:123456789:gateway/my-gateway';
                expect(isValidArnWithRegexKey(shortAccountArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });
        });

        describe('Wrong resource pattern validation', () => {
            it('should reject gateway ARN with OAuth pattern', () => {
                const gatewayArn = 'arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/my-gateway';
                expect(isValidArnWithRegexKey(gatewayArn, 'bedrock-agentcore', 'bedrock-agentcore-identity-OAUTH')).toBe(false);
            });

            it('should reject OAuth ARN with gateway pattern', () => {
                const oauthArn = 'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/vault/oauth2credentialprovider/provider';
                expect(isValidArnWithRegexKey(oauthArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });

            it('should reject lambda ARN with wrong resource format', () => {
                const invalidLambdaArn = 'arn:aws:lambda:us-east-1:123456789012:invalid-resource';
                expect(isValidArnWithRegexKey(invalidLambdaArn, 'lambda', 'lambda')).toBe(false);
            });
        });

        describe('Unknown regex key validation', () => {
            it('should reject ARNs with unknown regex key', () => {
                const validArn = 'arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/my-gateway';
                expect(isValidArnWithRegexKey(validArn, 'bedrock-agentcore', 'unknown-regex-key')).toBe(false);
            });

            it('should reject ARNs with empty regex key', () => {
                const validArn = 'arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/my-gateway';
                expect(isValidArnWithRegexKey(validArn, 'bedrock-agentcore', '')).toBe(false);
            });
        });

        describe('Edge cases', () => {
            it('should handle empty ARN string', () => {
                expect(isValidArnWithRegexKey('', 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });

            it('should handle null/undefined ARN', () => {
                expect(isValidArnWithRegexKey(null as any, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
                expect(isValidArnWithRegexKey(undefined as any, 'bedrock-agentcore', 'bedrock-agentcore-gateway')).toBe(false);
            });
        });
    });
});
