// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';

import {
    constructPayload,
    shouldIncludeAuthToken,
    shouldIncludePromptTemplate
} from '../../utils/construct-api-payload';
import { USE_CASE_TYPES, USE_CASE_TYPES_ROUTE } from '../../utils/constants';
import { AgentBuilderUseCaseConfig, AgentUseCaseConfig, TextUseCaseConfig, WorkflowUseCaseConfig } from '../../models';
import { UploadedFile } from '../../types/file-upload';

describe('constructPayload', () => {
    const baseConversationId = 'test-conversation-123';
    const baseMessage = 'Hello, how are you?';

    const mockFiles: UploadedFile[] = [
        {
            key: 'usecase-11111111-1111-1111-1111-111111111111/user-11111111-1111-1111-1111-111111111111/conv-11111111-1111-1111-1111-111111111111/msg-11111111-1111-1111-1111-111111111111/11111111-1111-1111-1111-111111111111.pdf',
            fileName: 'document.pdf',
            fileContentType: 'application/pdf',
            fileExtension: 'pdf',
            fileSize: 1024000
        },
        {
            key: 'usecase-11111111-1111-1111-1111-111111111111/user-11111111-1111-1111-1111-111111111111/conv-11111111-1111-1111-1111-111111111111/msg-11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.jpg',
            fileName: 'image.jpg',
            fileContentType: 'image/jpeg',
            fileExtension: 'jpg',
            fileSize: 512000
        }
    ];

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

    describe('AGENT_BUILDER use case', () => {
        const baseAgentBuilderConfig = {
            UseCaseType: USE_CASE_TYPES.AGENT_BUILDER
        } as AgentBuilderUseCaseConfig;

        it('should construct correct payload for AGENT_BUILDER use case', () => {
            const result = constructPayload({
                useCaseConfig: baseAgentBuilderConfig,
                message: baseMessage,
                conversationId: baseConversationId
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.AGENT_BUILDER,
                inputText: baseMessage,
                conversationId: baseConversationId
            });
        });

        it('should include files in AGENT_BUILDER payload when provided', () => {
            const useCaseId = 'test-use-case-123';
            const result = constructPayload({
                useCaseConfig: baseAgentBuilderConfig,
                message: baseMessage,
                conversationId: baseConversationId,
                files: mockFiles,
                useCaseId
            });

            const expectedFiles = [
                { fileReference: '11111111-1111-1111-1111-111111111111.pdf', fileName: 'document.pdf' },
                { fileReference: '22222222-2222-2222-2222-222222222222.jpg', fileName: 'image.jpg' }
            ];

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.AGENT_BUILDER,
                inputText: baseMessage,
                conversationId: baseConversationId,
                files: expectedFiles
            });
        });

        it('should throw error when useCaseId is not provided and files are present', () => {
            expect(() => {
                constructPayload({
                    useCaseConfig: baseAgentBuilderConfig,
                    message: baseMessage,
                    conversationId: baseConversationId,
                    files: mockFiles
                });
            }).toThrow(/useCaseId is required when files are present/);
        });

        it('should extract filename from file key structure', () => {
            const realisticFiles: UploadedFile[] = [
                {
                    key: 'usecase-11111111-1111-1111-1111-111111111111/user-11111111-1111-1111-1111-111111111111/conv-11111111-1111-1111-1111-111111111111/msg-11111111-1111-1111-1111-111111111111/11111111-1111-1111-1111-111111111111.pdf',
                    fileName: 'document.pdf',
                    fileContentType: 'application/pdf',
                    fileExtension: 'pdf',
                    fileSize: 1024000
                }
            ];

            const result = constructPayload({
                useCaseConfig: baseAgentBuilderConfig,
                message: baseMessage,
                conversationId: baseConversationId,
                files: realisticFiles,
                useCaseId: 'test-use-case-123'
            });

            const expectedFiles = [
                { fileReference: '11111111-1111-1111-1111-111111111111.pdf', fileName: 'document.pdf' }
            ];

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.AGENT_BUILDER,
                inputText: baseMessage,
                conversationId: baseConversationId,
                files: expectedFiles
            });
        });

        it('should not include files in AGENT_BUILDER payload when empty array', () => {
            const result = constructPayload({
                useCaseConfig: baseAgentBuilderConfig,
                message: baseMessage,
                conversationId: baseConversationId,
                files: []
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.AGENT_BUILDER,
                inputText: baseMessage,
                conversationId: baseConversationId
            });
            expect(result).not.toHaveProperty('files');
        });

        it('should include messageId in AGENT_BUILDER payload when provided', () => {
            const messageId = 'message-uuid-123';
            const result = constructPayload({
                useCaseConfig: baseAgentBuilderConfig,
                message: baseMessage,
                conversationId: baseConversationId,
                messageId
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.AGENT_BUILDER,
                inputText: baseMessage,
                conversationId: baseConversationId,
                messageId
            });
        });
    });

    describe('WORKFLOW use case', () => {
        const baseWorkflowConfig = {
            UseCaseType: USE_CASE_TYPES.WORKFLOW
        } as WorkflowUseCaseConfig;

        it('should construct correct payload for WORKFLOW use case', () => {
            const result = constructPayload({
                useCaseConfig: baseWorkflowConfig,
                message: baseMessage,
                conversationId: baseConversationId
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.WORKFLOW,
                inputText: baseMessage,
                conversationId: baseConversationId
            });
        });

        it('should include files in WORKFLOW payload when provided', () => {
            const useCaseId = 'test-use-case-123';
            const result = constructPayload({
                useCaseConfig: baseWorkflowConfig,
                message: baseMessage,
                conversationId: baseConversationId,
                files: mockFiles,
                useCaseId
            });

            const expectedFiles = [
                { fileReference: '11111111-1111-1111-1111-111111111111.pdf', fileName: 'document.pdf' },
                { fileReference: '22222222-2222-2222-2222-222222222222.jpg', fileName: 'image.jpg' }
            ];

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.WORKFLOW,
                inputText: baseMessage,
                conversationId: baseConversationId,
                files: expectedFiles
            });
        });

        it('should throw error when useCaseId is not provided and files are present', () => {
            expect(() => {
                constructPayload({
                    useCaseConfig: baseWorkflowConfig,
                    message: baseMessage,
                    conversationId: baseConversationId,
                    files: mockFiles
                });
            }).toThrow(/useCaseId is required when files are present/);
        });

        it('should not include files in WORKFLOW payload when empty array', () => {
            const result = constructPayload({
                useCaseConfig: baseWorkflowConfig,
                message: baseMessage,
                conversationId: baseConversationId,
                files: []
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.WORKFLOW,
                inputText: baseMessage,
                conversationId: baseConversationId
            });
            expect(result).not.toHaveProperty('files');
        });

        it('should include messageId in WORKFLOW payload when provided', () => {
            const messageId = 'message-uuid-123';
            const result = constructPayload({
                useCaseConfig: baseWorkflowConfig,
                message: baseMessage,
                conversationId: baseConversationId,
                messageId
            });

            expect(result).toEqual({
                action: USE_CASE_TYPES_ROUTE.WORKFLOW,
                inputText: baseMessage,
                conversationId: baseConversationId,
                messageId
            });
        });

        describe('Error handling', () => {
            it('should throw error for invalid use case type', () => {
                const invalidConfig = {
                    UseCaseType: 'INVALID_TYPE'
                } as any;

                expect(() => {
                    constructPayload({
                        useCaseConfig: invalidConfig,
                        message: baseMessage,
                        conversationId: baseConversationId
                    });
                }).toThrow('Invalid use case type.');
            });
        });

        describe('File handling edge cases', () => {
            const workflowConfig = {
                UseCaseType: USE_CASE_TYPES.WORKFLOW
            } as WorkflowUseCaseConfig;

            it('should handle undefined files parameter', () => {
                const result = constructPayload({
                    useCaseConfig: workflowConfig,
                    message: baseMessage,
                    conversationId: baseConversationId,
                    files: undefined
                });

                expect(result).toEqual({
                    action: USE_CASE_TYPES_ROUTE.WORKFLOW,
                    inputText: baseMessage,
                    conversationId: baseConversationId
                });
                expect(result).not.toHaveProperty('files');
            });

            it('should handle single file in array', () => {
                const singleFile = [mockFiles[0]];
                const result = constructPayload({
                    useCaseConfig: workflowConfig,
                    message: baseMessage,
                    conversationId: baseConversationId,
                    files: singleFile,
                    useCaseId: 'test-use-case-id'
                });

                expect(result).toEqual({
                    action: USE_CASE_TYPES_ROUTE.WORKFLOW,
                    inputText: baseMessage,
                    conversationId: baseConversationId,
                    files: [
                        {
                            fileReference: '11111111-1111-1111-1111-111111111111.pdf',
                            fileName: 'document.pdf'
                        }
                    ]
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
});
