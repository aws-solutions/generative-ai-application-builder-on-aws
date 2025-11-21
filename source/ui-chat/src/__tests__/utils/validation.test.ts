// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { validatePromptTemplate, parseTraceId, TraceDetails } from '../../utils/validation';
import { MODEL_PROVIDER } from '../../utils/constants';

describe('validatePromptTemplate', () => {
    const MAX_LENGTH = 100;

    it('should validate a correct non-RAG prompt template', () => {
        const result = validatePromptTemplate({
            promptTemplate: 'Here is the a correct non-RAG template',
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH
        });
        expect(result).toEqual({ isValid: true, error: '' });
    });

    it('should validate a correct RAG prompt template', () => {
        const result = validatePromptTemplate({
            promptTemplate: 'Context: {context}',
            isRagEnabled: true,
            maxPromptTemplateLength: MAX_LENGTH
        });
        expect(result).toEqual({ isValid: true, error: '' });
    });

    it('should fail when input placeholder is in template for non-SageMaker providers', () => {
        const result = validatePromptTemplate({
            promptTemplate: 'Context: {context}, Input: {input}',
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH
        });
        expect(result).toEqual({
            isValid: false,
            error: 'Please remove the {input} tags. The {input} placeholder is no longer used and will now be automatically added as the last message in the prompt.'
        });
    });

    it('should require input placeholder for SageMaker provider', () => {
        const result = validatePromptTemplate({
            promptTemplate: 'History: {history}',
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH,
            modelProvider: MODEL_PROVIDER.SAGEMAKER
        });
        expect(result).toEqual({
            isValid: false,
            error: 'The prompt template must contain the placeholder: {input}'
        });
    });

    it('should fail when history placeholder is in place for non-SageMaker providers', () => {
        const result = validatePromptTemplate({
            promptTemplate: 'History: {history}',
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH
        });
        expect(result).toEqual({
            isValid: false,
            error: 'Please remove the {history} tags. The {history} placeholder is no longer used and message history will now be automatically added after the system prompt and before the latest user input.'
        });
    });

    it('should require history placeholder for SageMaker provider', () => {
        const result = validatePromptTemplate({
            promptTemplate: 'Input: {input}',
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH,
            modelProvider: MODEL_PROVIDER.SAGEMAKER
        });
        expect(result).toEqual({
            isValid: false,
            error: 'The prompt template must contain the placeholder: {history}'
        });
    });

    it('should require both input and history placeholders for SageMaker provider', () => {
        // Test with both placeholders
        const resultWithBoth = validatePromptTemplate({
            promptTemplate: 'History: {history}, Input: {input}',
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH,
            modelProvider: MODEL_PROVIDER.SAGEMAKER
        });
        expect(resultWithBoth).toEqual({ isValid: true, error: '' });

        // Test with neither placeholder
        const resultWithNeither = validatePromptTemplate({
            promptTemplate: 'Just a prompt with no placeholders',
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH,
            modelProvider: MODEL_PROVIDER.SAGEMAKER
        });
        expect(resultWithNeither).toEqual({
            isValid: false,
            error: 'The prompt template must contain the placeholder: {input}'
        });
    });

    it('should fail when context is missing in RAG mode', () => {
        const result = validatePromptTemplate({
            promptTemplate: 'Input: {input}',
            isRagEnabled: true,
            maxPromptTemplateLength: MAX_LENGTH
        });
        expect(result).toEqual({
            isValid: false,
            error: 'The prompt template must contain the placeholder: {context}'
        });
    });

    it('should require context, input, and history for SageMaker in RAG mode', () => {
        // Missing history
        const resultMissingHistory = validatePromptTemplate({
            promptTemplate: 'Context: {context}, Input: {input}',
            isRagEnabled: true,
            maxPromptTemplateLength: MAX_LENGTH,
            modelProvider: MODEL_PROVIDER.SAGEMAKER
        });
        expect(resultMissingHistory).toEqual({
            isValid: false,
            error: 'The prompt template must contain the placeholder: {history}'
        });

        // Missing input
        const resultMissingInput = validatePromptTemplate({
            promptTemplate: 'Context: {context}, History: {history}',
            isRagEnabled: true,
            maxPromptTemplateLength: MAX_LENGTH,
            modelProvider: MODEL_PROVIDER.SAGEMAKER
        });
        expect(resultMissingInput).toEqual({
            isValid: false,
            error: 'The prompt template must contain the placeholder: {input}'
        });

        // Missing context
        const resultMissingContext = validatePromptTemplate({
            promptTemplate: 'Input: {input}, History: {history}',
            isRagEnabled: true,
            maxPromptTemplateLength: MAX_LENGTH,
            modelProvider: MODEL_PROVIDER.SAGEMAKER
        });
        expect(resultMissingContext).toEqual({
            isValid: false,
            error: 'The prompt template must contain the placeholder: {context}'
        });

        // All placeholders present
        const resultAllPresent = validatePromptTemplate({
            promptTemplate: 'Context: {context}, Input: {input}, History: {history}',
            isRagEnabled: true,
            maxPromptTemplateLength: MAX_LENGTH,
            modelProvider: MODEL_PROVIDER.SAGEMAKER
        });
        expect(resultAllPresent).toEqual({ isValid: true, error: '' });
    });

    it('should fail when prompt template exceeds maximum length', () => {
        const longTemplate = 'Context: {context}' + 'a'.repeat(MAX_LENGTH);
        const result = validatePromptTemplate({
            promptTemplate: longTemplate,
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH
        });
        expect(result).toEqual({
            isValid: false,
            error: `The prompt template has too many characters. Character count: ${longTemplate.length}/${MAX_LENGTH}`
        });
    });

    it('should validate when prompt template is at maximum length', () => {
        const template = '{context}' + 'a'.repeat(MAX_LENGTH - '{context}'.length);
        const result = validatePromptTemplate({
            promptTemplate: template,
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH
        });
        expect(result).toEqual({ isValid: true, error: '' });
    });

    it('should fail when prompt template is empty', () => {
        const result = validatePromptTemplate({
            promptTemplate: '',
            isRagEnabled: false,
            maxPromptTemplateLength: MAX_LENGTH
        });
        expect(result).toEqual({
            isValid: false,
            error: 'Enter a valid prompt template'
        });
    });

    it('should use default max length when not provided', () => {
        const longTemplate = 'context: {context}' + 'a'.repeat(10001);
        const result = validatePromptTemplate({
            promptTemplate: longTemplate,
            isRagEnabled: false
        });
        expect(result).toEqual({
            isValid: false,
            error: `The prompt template has too many characters. Character count: ${longTemplate.length}/10000`
        });
    });
});

describe('parseTraceId', () => {
    it('should parse a complete trace ID string', () => {
        const errorMessage = 'Error occurred Root=1-2345;Parent=abcd;Sampled=1;Lineage=test';
        const expected: TraceDetails = {
            rootId: '1-2345',
            parentId: 'abcd',
            sampled: true,
            lineage: 'test',
            message: 'Error occurred'
        };
        expect(parseTraceId(errorMessage)).toEqual(expected);
    });

    it('should handle missing optional components', () => {
        const errorMessage = 'Error Root=1-2345;Parent=abcd';
        const expected: TraceDetails = {
            rootId: '1-2345',
            parentId: 'abcd',
            sampled: false,
            lineage: '',
            message: 'Error'
        };
        expect(parseTraceId(errorMessage)).toEqual(expected);
    });

    it('should throw error when no Root= is found', () => {
        const errorMessage = 'Error message without trace ID';
        expect(() => parseTraceId(errorMessage)).toThrow('No trace ID found in message');
    });

    it('should handle empty message before trace ID', () => {
        const errorMessage = 'Root=1-2345;Parent=abcd';
        const expected: TraceDetails = {
            rootId: '1-2345',
            parentId: 'abcd',
            sampled: false,
            lineage: '',
            message: ''
        };
        expect(parseTraceId(errorMessage)).toEqual(expected);
    });

    it('should parse sampled flag correctly', () => {
        const errorMessage = 'Error Root=1-2345;Sampled=1';
        expect(parseTraceId(errorMessage).sampled).toBe(true);

        const errorMessage2 = 'Error Root=1-2345;Sampled=0';
        expect(parseTraceId(errorMessage2).sampled).toBe(false);
    });

    it('should handle malformed trace ID components', () => {
        const errorMessage = 'Error Root=1-2345;InvalidFormat;Parent=abcd';
        const result = parseTraceId(errorMessage);
        expect(result.rootId).toBe('1-2345');
        expect(result.parentId).toBe('abcd');
    });

    it('should parse new AgentCore format with trace ID', () => {
        const errorMessage = 'Chat service failed to respond. Please contact your administrator for support and quote the following trace id: 1-abc123-def456';
        const expected: TraceDetails = {
            rootId: '1-abc123-def456',
            parentId: '',
            sampled: false,
            lineage: '',
            message: 'Chat service failed to respond.'
        };
        expect(parseTraceId(errorMessage)).toEqual(expected);
    });

    it('should parse new AgentCore format with different error message', () => {
        const errorMessage = 'AgentCore invocation failed. Please contact your administrator for support and quote the following trace id: trace-xyz789';
        const expected: TraceDetails = {
            rootId: 'trace-xyz789',
            parentId: '',
            sampled: false,
            lineage: '',
            message: 'AgentCore invocation failed.'
        };
        expect(parseTraceId(errorMessage)).toEqual(expected);
    });

    it('should handle case insensitive trace ID matching', () => {
        const errorMessage = 'Error occurred. Please contact your administrator for support and Quote The Following Trace ID: test-123';
        const expected: TraceDetails = {
            rootId: 'test-123',
            parentId: '',
            sampled: false,
            lineage: '',
            message: 'Error occurred.'
        };
        expect(parseTraceId(errorMessage)).toEqual(expected);
    });
});
