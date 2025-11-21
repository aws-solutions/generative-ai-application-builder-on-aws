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

        it('should include MultimodalParams when present and enabled', () => {
            const paramsWithMultimodal = {
                ...testParams,
                LlmParams: {
                    ...testParams.LlmParams,
                    MultimodalParams: {
                        MultimodalEnabled: true
                    }
                }
            };

            const result = castToResponse(paramsWithMultimodal);

            expect(result.LlmParams?.MultimodalParams).toEqual({
                MultimodalEnabled: true
            });
        });

        it('should include MultimodalParams when present and disabled', () => {
            const paramsWithMultimodal = {
                ...testParams,
                LlmParams: {
                    ...testParams.LlmParams,
                    MultimodalParams: {
                        MultimodalEnabled: false
                    }
                }
            };

            const result = castToResponse(paramsWithMultimodal);

            expect(result.LlmParams?.MultimodalParams).toEqual({
                MultimodalEnabled: false
            });
        });

        it('should not include MultimodalParams when not present', () => {
            const result = castToResponse(testParams);
            expect(result.LlmParams?.MultimodalParams).toBeUndefined();
        });

        it('should handle MultimodalParams with other LlmParams', () => {
            const paramsWithMultimodal = {
                ...testParams,
                LlmParams: {
                    ...testParams.LlmParams,
                    MultimodalParams: {
                        MultimodalEnabled: true
                    }
                }
            };

            const result = castToResponse(paramsWithMultimodal);

            expect(result.LlmParams?.MultimodalParams).toEqual({
                MultimodalEnabled: true
            });
            expect(result.LlmParams?.RAGEnabled).toBe(false);
            expect(result.LlmParams?.PromptParams).toBeDefined();
        });

        it('should handle MultimodalParams only (no other LlmParams)', () => {
            const paramsWithOnlyMultimodal = {
                UseCaseName: 'Multimodal Only',
                UseCaseType: 'Multimodal',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    MultimodalParams: {
                        MultimodalEnabled: true
                    }
                }
            };

            const result = castToResponse(paramsWithOnlyMultimodal);

            expect(result.LlmParams?.MultimodalParams).toEqual({
                MultimodalEnabled: true
            });
            expect(result.LlmParams?.RAGEnabled).toBeUndefined();
            expect(result.LlmParams?.PromptParams).toBeUndefined();
            expect(result.ModelProviderName).toBe('Bedrock');
        });

        it('should handle empty LlmParams with MultimodalParams', () => {
            const paramsWithEmptyLlm = {
                UseCaseName: 'Empty LLM',
                UseCaseType: 'Text',
                LlmParams: {
                    MultimodalParams: {
                        MultimodalEnabled: false
                    }
                }
            };

            const result = castToResponse(paramsWithEmptyLlm);

            expect(result.LlmParams?.MultimodalParams).toEqual({
                MultimodalEnabled: false
            });
            expect(result.ModelProviderName).toBe('BedrockAgent'); // Default value
        });

        it('should handle undefined LlmParams', () => {
            const paramsWithoutLlm = {
                UseCaseName: 'No LLM',
                UseCaseType: 'Text'
            };

            const result = castToResponse(paramsWithoutLlm);

            expect(result.LlmParams).toBeUndefined();
            expect(result.ModelProviderName).toBe('BedrockAgent'); // Default value
        });

        it('should preserve all MultimodalParams properties', () => {
            // Test with potential future extensions to MultimodalParams
            const paramsWithExtendedMultimodal = {
                UseCaseName: 'Extended Multimodal',
                UseCaseType: 'Multimodal',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    MultimodalParams: {
                        MultimodalEnabled: true,
                        // These would be additional properties if added in the future
                        MaxFileSize: 10485760,
                        SupportedFormats: ['image/jpeg', 'image/png']
                    }
                }
            };

            const result = castToResponse(paramsWithExtendedMultimodal);

            expect(result.LlmParams?.MultimodalParams).toEqual({
                MultimodalEnabled: true,
                MaxFileSize: 10485760,
                SupportedFormats: ['image/jpeg', 'image/png']
            });
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
