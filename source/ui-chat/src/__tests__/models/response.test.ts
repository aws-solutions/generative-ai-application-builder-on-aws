// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import {
    ChatResponse,
    AgentBuilderChatResponse,
    ToolUsageInfo,
    ThinkingState
} from '../../models/api/response';

describe('ChatResponse Extended Types', () => {
    describe('ToolUsageInfo', () => {
        it('should create a valid ToolUsageInfo object', () => {
            const toolUsage: ToolUsageInfo = {
                toolName: 'test-tool',
                status: 'completed',
                startTime: '2025-10-06T00:00:00Z',
                endTime: '2025-10-06T00:00:05Z',
                toolInput: { param: 'value' },
                toolOutput: 'result',
                mcpServerName: 'test-server'
            };

            expect(toolUsage.toolName).toBe('test-tool');
            expect(toolUsage.status).toBe('completed');
            expect(toolUsage.mcpServerName).toBe('test-server');
        });

        it('should support all status types', () => {
            const statuses: ToolUsageInfo['status'][] = ['started', 'in_progress', 'completed', 'failed'];
            statuses.forEach((status) => {
                const toolUsage: ToolUsageInfo = {
                    toolName: 'test',
                    status,
                    startTime: '2025-10-06T00:00:00Z'
                };
                expect(toolUsage.status).toBe(status);
            });
        });
    });

    describe('ThinkingState', () => {
        it('should create a valid ThinkingState object', () => {
            const thinking: ThinkingState = {
                isThinking: true,
                thinkingMessage: 'Analyzing your request...',
                startTime: '2025-10-06T00:00:00Z'
            };

            expect(thinking.isThinking).toBe(true);
            expect(thinking.startTime).toBe('2025-10-06T00:00:00Z');
        });
    });

    describe('ChatResponse with extended fields', () => {
        it('should create a ChatResponse with streaming fields', () => {
            const response: ChatResponse = {
                data: 'partial response',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                isStreaming: true,
                streamComplete: false
            };

            expect(response.isStreaming).toBe(true);
            expect(response.streamComplete).toBe(false);
        });

        it('should create a ChatResponse with toolUsage', () => {
            const response: ChatResponse = {
                data: 'response',
                conversationId: 'conv-123',
                toolUsage: {
                    toolName: 'search',
                    status: 'completed',
                    startTime: '2025-10-06T00:00:00Z'
                }
            };

            expect(response.toolUsage?.toolName).toBe('search');
            expect(response.toolUsage?.status).toBe('completed');
        });

        it('should create a ChatResponse with thinking state', () => {
            const response: ChatResponse = {
                conversationId: 'conv-123',
                thinking: {
                    isThinking: true,
                    startTime: '2025-10-06T00:00:00Z'
                }
            };

            expect(response.thinking?.isThinking).toBe(true);
            expect(response.thinking?.startTime).toBe('2025-10-06T00:00:00Z');
        });

        it('should create a ChatResponse with all advanced features', () => {
            const response: ChatResponse = {
                data: 'comprehensive response',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                isStreaming: false,
                streamComplete: true,
                toolUsage: {
                    toolName: 'calculator',
                    status: 'completed',
                    startTime: '2025-10-06T00:00:00Z',
                    endTime: '2025-10-06T00:00:02Z'
                },
                thinking: {
                    isThinking: false,
                    startTime: '2025-10-06T00:00:00Z'
                }
            };

            expect(response.data).toBe('comprehensive response');
            expect(response.streamComplete).toBe(true);
            expect(response.toolUsage?.status).toBe('completed');
            expect(response.thinking?.isThinking).toBe(false);
        });
    });

    describe('AgentBuilderChatResponse', () => {
        it('should create a valid AgentBuilderChatResponse', () => {
            const response: AgentBuilderChatResponse = {
                data: 'agent response',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                isStreaming: true,
                toolUsage: {
                    toolName: 'mcp-tool',
                    status: 'in_progress',
                    startTime: '2025-10-06T00:00:00Z',
                    mcpServerName: 'my-mcp-server'
                }
            };

            expect(response.data).toBe('agent response');
            expect(response.isStreaming).toBe(true);
            expect(response.toolUsage?.mcpServerName).toBe('my-mcp-server');
        });

        it('should be compatible with ChatResponse', () => {
            const agentResponse: AgentBuilderChatResponse = {
                data: 'test',
                conversationId: 'conv-123'
            };

            const chatResponse: ChatResponse = agentResponse;
            expect(chatResponse.data).toBe('test');
        });
    });
});
