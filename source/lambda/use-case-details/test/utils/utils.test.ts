// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { APIGatewayProxyEvent } from 'aws-lambda';
import { validateAndParseRequest, getRetrySettings, delay, RetrySettings, castToResponse } from '../../utils/utils';
import { RETRY_CONFIG } from '../../utils/constants';

describe('Utils', () => {
    describe('validateAndParseRequest', () => {
        it('should return UseCaseConfigKey when present in path parameters', () => {
            const event = {
                pathParameters: {
                    useCaseConfigKey: 'test-key'
                }
            } as unknown as APIGatewayProxyEvent;

            const result = validateAndParseRequest(event);
            expect(result).toBe('test-key');
        });

        it('should return error response when UseCaseConfigKey is missing', () => {
            const event = {
                pathParameters: {}
            } as APIGatewayProxyEvent;

            expect(() => validateAndParseRequest(event)).toThrow('UseCaseConfigKey is missing');
        });

        it('should return error response when pathParameters is null', () => {
            const event = {
                pathParameters: null
            } as APIGatewayProxyEvent;

            expect(() => validateAndParseRequest(event)).toThrow('UseCaseConfigKey is missing');
        });
    });

    describe('castToResponseType', () => {
        const testParams = {
            AuthenticationParams: {
                AuthenticationProvider: 'Cognito',
                CognitoParams: { ExistingUserPoolId: 'not-real' }
            },
            ConversationMemoryParams: {
                AiPrefix: 'AI',
                ChatHistoryLength: 20,
                ConversationMemoryType: 'DynamoDB',
                HumanPrefix: 'Human'
            },
            IsInternalUser: 'true',
            KnowledgeBaseParams: {},
            LlmParams: {
                BedrockLlmParams: { ModelId: 'fake-model' },
                ModelParams: {},
                ModelProvider: 'Bedrock',
                PromptParams: {
                    MaxInputTextLength: 7500,
                    MaxPromptTemplateLength: 7500,
                    PromptTemplate: '{history}\n\n{input}',
                    RephraseQuestion: true,
                    UserPromptEditingEnabled: true
                },
                RAGEnabled: false,
                Streaming: false,
                Temperature: 0.9,
                Verbose: false
            },
            UseCaseName: 'test2',
            UseCaseType: 'Text',
            FeedbackParams: {
                FeedbackEnabled: false
            }
        };

        it('should return proper Details Response when passed in', () => {
            const expected = {
                UseCaseName: 'test2',
                UseCaseType: 'Text',
                LlmParams: {
                    PromptParams: {
                        UserPromptEditingEnabled: true,
                        MaxInputTextLength: 7500,
                        PromptTemplate: '{history}\n\n{input}',
                        MaxPromptTemplateLength: 7500
                    },
                    RAGEnabled: false
                },
                ModelProviderName: 'Bedrock',
                FeedbackParams: {
                    FeedbackEnabled: false
                }
            };
            const result = castToResponse(testParams);
            expect(result).toEqual(expected);
        });
    });

    describe('getRetrySettings', () => {
        it('should return retry settings from RETRY_CONFIG', () => {
            const expected: RetrySettings = {
                maxRetries: RETRY_CONFIG.maxRetries,
                backOffRate: RETRY_CONFIG.backOffRate,
                initialDelayMs: RETRY_CONFIG.initialDelayMs
            };

            const result = getRetrySettings();
            expect(result).toEqual(expected);
        });
    });

    describe('delay', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should resolve after specified delay', async () => {
            const delayTime = 1000;
            const delayPromise = delay(delayTime);

            // Fast-forward time
            jest.advanceTimersByTime(delayTime);

            await expect(delayPromise).resolves.toBeUndefined();
        });

        it('should not resolve before specified delay', async () => {
            const delayTime = 1000;
            let resolved = false;

            delay(delayTime).then(() => {
                resolved = true;
            });

            // Advance time by less than delay
            jest.advanceTimersByTime(delayTime - 1);
            expect(resolved).toBe(false);

            // Advance remaining time
            jest.advanceTimersByTime(1);
            await Promise.resolve(); // Allow any pending promises to resolve
            expect(resolved).toBe(true);
        });
    });
});
