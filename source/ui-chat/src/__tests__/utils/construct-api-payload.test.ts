// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';

import {
    constructPayload,
    shouldIncludeAuthToken,
    shouldIncludePromptTemplate
} from '../../utils/construct-api-payload';
import { USE_CASE_TYPES, USE_CASE_TYPES_ROUTE } from '../../utils/constants';
import { AgentUseCaseConfig, TextUseCaseConfig } from '../../models';

describe('constructPayload', () => {
    const baseConversationId = 'test-conversation-123';
    const baseMessage = 'Hello, how are you?';

    describe('AGENT use case', () => {
        const agentConfig = {
            UseCaseType: USE_CASE_TYPES.AGENT
        } as AgentUseCaseConfig;

        it('should construct correct payload for AGENT use case', () => {
            const result = constructPayload({
                useCaseConfig: agentConfig,
                message: baseMessage,
                conversationId: baseConversationId
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.AGENT,
                inputText: baseMessage,
                conversationId: baseConversationId
            });
        });
    });

    describe('TEXT use case', () => {
        const baseTextConfig = {
            UseCaseType: USE_CASE_TYPES.TEXT,
            LlmParams: {
                PromptParams: {
                    UserPromptEditingEnabled: false,
                    PromptTemplate: 'default template'
                },
                RAGEnabled: false
            }
        } as TextUseCaseConfig;

        it('should construct basic payload for TEXT use case', () => {
            const result = constructPayload({
                useCaseConfig: baseTextConfig,
                message: baseMessage,
                conversationId: baseConversationId
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.TEXT,
                question: baseMessage,
                conversationId: baseConversationId
            });
        });

        it('should include promptTemplate when UserPromptEditingEnabled is true and template differs', () => {
            const config = {
                ...baseTextConfig,
                LlmParams: {
                    ...baseTextConfig.LlmParams,
                    PromptParams: {
                        UserPromptEditingEnabled: true,
                        PromptTemplate: 'default template'
                    }
                }
            };

            const customTemplate = 'custom template';
            const result = constructPayload({
                useCaseConfig: config,
                message: baseMessage,
                conversationId: baseConversationId,
                promptTemplate: customTemplate
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.TEXT,
                question: baseMessage,
                conversationId: baseConversationId,
                promptTemplate: customTemplate
            });
        });

        it('should not include promptTemplate when templates are identical', () => {
            const config = {
                ...baseTextConfig,
                LlmParams: {
                    ...baseTextConfig.LlmParams,
                    PromptParams: {
                        UserPromptEditingEnabled: true,
                        PromptTemplate: 'same template'
                    }
                }
            };

            const result = constructPayload({
                useCaseConfig: config,
                message: baseMessage,
                conversationId: baseConversationId,
                promptTemplate: 'same template'
            });

            expect(result).not.toHaveProperty('promptTemplate');
        });

        it('should include authToken when RAGEnabled is true', () => {
            const config = {
                ...baseTextConfig,
                LlmParams: {
                    ...baseTextConfig.LlmParams,
                    RAGEnabled: true
                }
            };

            const authToken = 'test-auth-token';
            const result = constructPayload({
                useCaseConfig: config,
                message: baseMessage,
                conversationId: baseConversationId,
                authToken
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.TEXT,
                question: baseMessage,
                conversationId: baseConversationId,
                authToken
            });
        });

        it('should not include authToken when RAGEnabled is false', () => {
            const authToken = 'test-auth-token';
            const result = constructPayload({
                useCaseConfig: baseTextConfig,
                message: baseMessage,
                conversationId: baseConversationId,
                authToken
            });

            expect(result).not.toHaveProperty('authToken');
        });

        it('should include both promptTemplate and authToken when conditions are met', () => {
            const config = {
                ...baseTextConfig,
                LlmParams: {
                    ...baseTextConfig.LlmParams,
                    RAGEnabled: true,
                    PromptParams: {
                        UserPromptEditingEnabled: true,
                        PromptTemplate: 'default template'
                    }
                }
            };

            const customTemplate = 'custom template';
            const authToken = 'test-auth-token';
            const result = constructPayload({
                useCaseConfig: config,
                message: baseMessage,
                conversationId: baseConversationId,
                promptTemplate: customTemplate,
                authToken
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.TEXT,
                question: baseMessage,
                conversationId: baseConversationId,
                promptTemplate: customTemplate,
                authToken
            });
        });
    });
});

describe('Helper functions', () => {
    describe('shouldIncludePromptTemplate', () => {
        const baseConfig = {
            UseCaseType: USE_CASE_TYPES.TEXT,
            LlmParams: {
                PromptParams: {
                    UserPromptEditingEnabled: true,
                    PromptTemplate: 'default template'
                },
                RAGEnabled: false
            }
        } as TextUseCaseConfig;

        it('should return true when all conditions are met', () => {
            const result = shouldIncludePromptTemplate(baseConfig, 'custom template');
            expect(result).toBe(true);
        });

        it('should return false when UserPromptEditingEnabled is false', () => {
            const config = {
                ...baseConfig,
                LlmParams: {
                    ...baseConfig.LlmParams,
                    PromptParams: {
                        ...baseConfig.LlmParams.PromptParams,
                        UserPromptEditingEnabled: false
                    }
                }
            };
            const result = shouldIncludePromptTemplate(config, 'custom template');
            expect(result).toBe(false);
        });

        it('should return false when promptTemplate matches default', () => {
            const result = shouldIncludePromptTemplate(baseConfig, 'default template');
            expect(result).toBe(false);
        });

        it('should return false when promptTemplate is undefined', () => {
            const result = shouldIncludePromptTemplate(baseConfig, undefined);
            expect(result).toBe(false);
        });
    });

    describe('shouldIncludeAuthToken', () => {
        const baseConfig = {
            UseCaseType: USE_CASE_TYPES.TEXT,
            LlmParams: {
                PromptParams: {
                    UserPromptEditingEnabled: false,
                    PromptTemplate: 'default template'
                },
                RAGEnabled: true
            }
        } as TextUseCaseConfig;

        it('should return true when RAGEnabled and authToken are present', () => {
            const result = shouldIncludeAuthToken(baseConfig, 'test-token');
            expect(result).toBe(true);
        });

        it('should return false when RAGEnabled is false', () => {
            const config = {
                ...baseConfig,
                LlmParams: {
                    ...baseConfig.LlmParams,
                    RAGEnabled: false
                }
            };
            const result = shouldIncludeAuthToken(config, 'test-token');
            expect(result).toBe(false);
        });

        it('should return false when authToken is undefined', () => {
            const result = shouldIncludeAuthToken(baseConfig, undefined);
            expect(result).toBe(false);
        });
    });
});
