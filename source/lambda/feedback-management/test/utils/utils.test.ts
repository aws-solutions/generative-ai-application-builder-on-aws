// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent } from 'aws-lambda';
import { getUserId, validateAndParseFeedbackRequest } from '../../utils/utils';
import { FeedbackRequest } from '../../model/data-model';
import { FeedbackType } from '../../utils/constants';

describe('getUserId', () => {
    it('returns userId from authorizer when present', () => {
        const mockEvent = {
            requestContext: {
                authorizer: {
                    UserId: 'mock-user-123',
                    principalId: '*',
                    integrationLatency: 2185
                },
                resourceId: 'mock-resource',
                resourcePath: '/feedback'
            }
        } as unknown as APIGatewayProxyEvent;

        expect(getUserId(mockEvent)).toBe('mock-user-123');
    });

    it('returns "unknown" when UserId is not present in authorizer', () => {
        const mockEvent = {
            requestContext: {
                authorizer: {
                    principalId: '*',
                    integrationLatency: 2185
                },
                resourceId: 'mock-resource',
                resourcePath: '/feedback'
            }
        } as unknown as APIGatewayProxyEvent;

        expect(getUserId(mockEvent)).toBe('unknown');
    });

    it('returns "unknown" when authorizer is not present', () => {
        const mockEvent = {
            requestContext: {
                resourceId: 'mock-resource',
                resourcePath: '/feedback'
            }
        } as APIGatewayProxyEvent;

        expect(getUserId(mockEvent)).toBe('unknown');
    });
});

describe('validateAndParseFeedbackRequest', () => {
    const validFeedbackData: FeedbackRequest = {
        conversationId: 'conv-123',
        messageId: 'fake-msg-id',
        feedback: FeedbackType.negative,
        rephrasedQuery: 'Explain AWS Lambda',
        feedbackReason: ['Inaccurate', 'Harmful'],
        comment: 'Great explanation',
        useCaseRecordKey: 'config-key-123'
    };

    it('successfully validates and parses valid request', () => {
        const mockEvent = {
            body: JSON.stringify(validFeedbackData)
        } as unknown as APIGatewayProxyEvent;

        const result = validateAndParseFeedbackRequest(mockEvent);
        expect(result).toEqual(validFeedbackData);
    });

    it('successfully validates request with only required fields', () => {
        const minimalFeedbackData: FeedbackRequest = {
            conversationId: 'conv-123',
            messageId: 'fake-msg-id',
            feedback: FeedbackType.negative,
            useCaseRecordKey: 'config-key-123'
        };

        const mockEvent = {
            body: JSON.stringify(minimalFeedbackData)
        } as unknown as APIGatewayProxyEvent;

        const result = validateAndParseFeedbackRequest(mockEvent);
        expect(result).toEqual(minimalFeedbackData);
    });

    it('throws error when body is invalid JSON', () => {
        const mockEvent = {
            pathParameters: {
                useCaseId: 'use-case-123'
            },
            body: 'invalid-json'
        } as unknown as APIGatewayProxyEvent;

        expect(() => validateAndParseFeedbackRequest(mockEvent)).toThrow('Invalid JSON body');
    });

    it('throws error when required fields are missing', () => {
        const invalidFeedbackData = {
            conversationId: 'conv-123',
            userInput: 'What is AWS Lambda?'
            // missing messageId, feedback, and useCaseRecordKey
        };

        const mockEvent = {
            pathParameters: {
                useCaseId: 'use-case-123'
            },
            body: JSON.stringify(invalidFeedbackData)
        } as unknown as APIGatewayProxyEvent;

        expect(() => validateAndParseFeedbackRequest(mockEvent)).toThrow(
            'Missing required feedback fields: messageId,feedback,useCaseRecordKey'
        );
    });

    it('throws error when feedback has invalid value', () => {
        const invalidFeedbackData = {
            conversationId: 'conv-123',
            messageId: 'fake-msg-id',
            feedback: 'invalid', // should be 'positive' or 'negative'
            useCaseRecordKey: 'config-key-123'
        };

        const mockEvent = {
            pathParameters: {
                useCaseId: 'use-case-123'
            },
            body: JSON.stringify(invalidFeedbackData)
        } as unknown as APIGatewayProxyEvent;

        expect(() => validateAndParseFeedbackRequest(mockEvent)).toThrow(
            'Invalid feedback type. Must be one of: positive, negative'
        );
    });

    it('throws error when body is empty', () => {
        const mockEvent = {
            pathParameters: {
                useCaseId: 'use-case-123'
            },
            body: ''
        } as unknown as APIGatewayProxyEvent;

        expect(() => validateAndParseFeedbackRequest(mockEvent)).toThrow('Missing request body');
    });

    it('throws error when body is null', () => {
        const mockEvent = {
            pathParameters: {
                useCaseId: 'use-case-123'
            },
            body: null
        } as unknown as APIGatewayProxyEvent;

        expect(() => validateAndParseFeedbackRequest(mockEvent)).toThrow('Missing request body');
    });

    it('throws error when useCaseRecordKey is missing', () => {
        const invalidFeedbackData = {
            conversationId: 'conv-123',
            feedback: 'positive'
            // missing useCaseRecordKey and messageId
        };

        const mockEvent = {
            pathParameters: {
                useCaseId: 'use-case-123'
            },
            body: JSON.stringify(invalidFeedbackData)
        } as unknown as APIGatewayProxyEvent;

        expect(() => validateAndParseFeedbackRequest(mockEvent)).toThrow('Missing required feedback fields');
    });
});
