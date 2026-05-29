// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import configReducer, {
    setRuntimeConfig,
    setLoading,
    setError,
    setUseCaseConfig,
    selectDefaultPromptTemplate,
    selectUseCaseType,
    getPromptTemplateLength,
    getMaxInputTextLength,
    getRagEnabledState,
    getUseCaseId,
    getUseCaseConfigKey,
    getUseCaseConfig,
    getFeedbackEnabledState,
    getMultimodalEnabledState,
    getModelProviderName,
    ConfigState
} from '@store/configSlice';
import { RuntimeConfig } from '../../models';
import { USE_CASE_TYPES, DEFAULT_CHAT_INPUT_MAX_LENGTH, AGENT_BUILDER_CHAT_INPUT_MAX_LENGTH, MAX_PROMPT_TEMPLATE_LENGTH } from '../../utils/constants';

describe('configSlice', () => {
    const initialState: ConfigState = {
        runtimeConfig: null,
        loading: false,
        error: null
    };

    describe('reducers', () => {
        it('should return the initial state', () => {
            const state = configReducer(undefined, { type: 'unknown' });
            expect(state.runtimeConfig).toBeNull();
            expect(state.loading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should handle setRuntimeConfig', () => {
            const config = { UseCaseId: 'test-123', UseCaseConfig: { UseCaseType: 'Text' } } as unknown as RuntimeConfig;
            const state = configReducer(initialState, setRuntimeConfig(config));
            expect(state.runtimeConfig).toEqual(config);
            expect(state.loading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should handle setLoading', () => {
            const state = configReducer(initialState, setLoading(true));
            expect(state.loading).toBe(true);
        });

        it('should handle setError', () => {
            const state = configReducer(initialState, setError('Something went wrong'));
            expect(state.error).toBe('Something went wrong');
            expect(state.loading).toBe(false);
        });

        it('should handle setUseCaseConfig', () => {
            const stateWithConfig = {
                ...initialState,
                runtimeConfig: { UseCaseId: 'test', UseCaseConfig: { UseCaseType: 'Text' } } as unknown as RuntimeConfig
            };
            const newConfig = { UseCaseType: 'Agent', AgentParams: {} } as any;
            const state = configReducer(stateWithConfig, setUseCaseConfig(newConfig));
            expect(state.runtimeConfig?.UseCaseConfig).toEqual(newConfig);
        });
    });

    describe('selectors', () => {
        const createState = (runtimeConfig: Partial<RuntimeConfig> | null) => ({
            config: { runtimeConfig: runtimeConfig as RuntimeConfig | null, loading: false, error: null }
        });

        it('selectDefaultPromptTemplate returns template from text config', () => {
            const state = createState({
                UseCaseConfig: {
                    UseCaseType: 'Text',
                    LlmParams: { PromptParams: { PromptTemplate: 'Hello {input}' } }
                } as any
            });
            expect(selectDefaultPromptTemplate(state as any)).toBe('Hello {input}');
        });

        it('selectDefaultPromptTemplate returns empty string when no config', () => {
            const state = createState(null);
            expect(selectDefaultPromptTemplate(state as any)).toBe('');
        });

        it('selectUseCaseType returns the use case type', () => {
            const state = createState({
                UseCaseConfig: { UseCaseType: USE_CASE_TYPES.AGENT } as any
            });
            expect(selectUseCaseType(state as any)).toBe(USE_CASE_TYPES.AGENT);
        });

        it('selectUseCaseType defaults to Text when no config', () => {
            const state = createState(null);
            expect(selectUseCaseType(state as any)).toBe(USE_CASE_TYPES.TEXT);
        });

        it('getPromptTemplateLength returns configured max length', () => {
            const state = createState({
                UseCaseConfig: {
                    UseCaseType: 'Text',
                    LlmParams: { PromptParams: { MaxPromptTemplateLength: 5000 } }
                } as any
            });
            expect(getPromptTemplateLength(state as any)).toBe(5000);
        });

        it('getPromptTemplateLength returns default when not configured', () => {
            const state = createState({ UseCaseConfig: { UseCaseType: 'Text' } as any });
            expect(getPromptTemplateLength(state as any)).toBe(MAX_PROMPT_TEMPLATE_LENGTH);
        });

        it('getMaxInputTextLength returns default for Agent use case', () => {
            const state = createState({
                UseCaseConfig: { UseCaseType: USE_CASE_TYPES.AGENT } as any
            });
            expect(getMaxInputTextLength(state as any)).toBe(DEFAULT_CHAT_INPUT_MAX_LENGTH);
        });

        it('getMaxInputTextLength returns agent builder length for AgentBuilder use case', () => {
            const state = createState({
                UseCaseConfig: { UseCaseType: USE_CASE_TYPES.AGENT_BUILDER } as any
            });
            expect(getMaxInputTextLength(state as any)).toBe(AGENT_BUILDER_CHAT_INPUT_MAX_LENGTH);
        });

        it('getMaxInputTextLength returns agent builder length for Workflow use case', () => {
            const state = createState({
                UseCaseConfig: { UseCaseType: USE_CASE_TYPES.WORKFLOW } as any
            });
            expect(getMaxInputTextLength(state as any)).toBe(AGENT_BUILDER_CHAT_INPUT_MAX_LENGTH);
        });

        it('getMaxInputTextLength returns configured length for Text use case', () => {
            const state = createState({
                UseCaseConfig: {
                    UseCaseType: 'Text',
                    LlmParams: { PromptParams: { MaxInputTextLength: 2000 } }
                } as any
            });
            expect(getMaxInputTextLength(state as any)).toBe(2000);
        });

        it('getRagEnabledState returns RAG enabled value', () => {
            const state = createState({
                UseCaseConfig: {
                    UseCaseType: 'Text',
                    LlmParams: { RAGEnabled: true }
                } as any
            });
            expect(getRagEnabledState(state as any)).toBe(true);
        });

        it('getUseCaseId returns the use case ID', () => {
            const state = createState({ UseCaseId: 'uc-123' });
            expect(getUseCaseId(state as any)).toBe('uc-123');
        });

        it('getUseCaseId returns empty string when no config', () => {
            const state = createState(null);
            expect(getUseCaseId(state as any)).toBe('');
        });

        it('getUseCaseConfigKey returns the config key', () => {
            const state = createState({ UseCaseConfigKey: 'config-key-456' });
            expect(getUseCaseConfigKey(state as any)).toBe('config-key-456');
        });

        it('getUseCaseConfigKey returns empty string when no config', () => {
            const state = createState(null);
            expect(getUseCaseConfigKey(state as any)).toBe('');
        });

        it('getUseCaseConfig returns the use case config', () => {
            const useCaseConfig = { UseCaseType: 'Text', LlmParams: {} } as any;
            const state = createState({ UseCaseConfig: useCaseConfig });
            expect(getUseCaseConfig(state as any)).toEqual(useCaseConfig);
        });

        it('getFeedbackEnabledState returns true when enabled', () => {
            const state = createState({
                UseCaseConfig: { FeedbackParams: { FeedbackEnabled: true } } as any
            });
            expect(getFeedbackEnabledState(state as any)).toBe(true);
        });

        it('getFeedbackEnabledState returns false when not configured', () => {
            const state = createState({ UseCaseConfig: {} as any });
            expect(getFeedbackEnabledState(state as any)).toBe(false);
        });

        it('getMultimodalEnabledState returns true for supported use case with multimodal enabled', () => {
            const state = createState({
                UseCaseConfig: {
                    UseCaseType: USE_CASE_TYPES.AGENT_BUILDER,
                    LlmParams: { MultimodalParams: { MultimodalEnabled: true } }
                } as any
            });
            expect(getMultimodalEnabledState(state as any)).toBe(true);
        });

        it('getMultimodalEnabledState returns false when no config', () => {
            const state = createState(null);
            expect(getMultimodalEnabledState(state as any)).toBe(false);
        });

        it('getMultimodalEnabledState returns false for unsupported use case type', () => {
            const state = createState({
                UseCaseConfig: {
                    UseCaseType: 'UnsupportedType',
                    LlmParams: { MultimodalParams: { MultimodalEnabled: true } }
                } as any
            });
            expect(getMultimodalEnabledState(state as any)).toBe(false);
        });

        it('getMultimodalEnabledState returns false when multimodal not enabled', () => {
            const state = createState({
                UseCaseConfig: {
                    UseCaseType: USE_CASE_TYPES.AGENT_BUILDER,
                    LlmParams: { MultimodalParams: { MultimodalEnabled: false } }
                } as any
            });
            expect(getMultimodalEnabledState(state as any)).toBe(false);
        });

        it('getModelProviderName returns provider name', () => {
            const state = createState({
                UseCaseConfig: { ModelProviderName: 'Bedrock' } as any
            });
            expect(getModelProviderName(state as any)).toBe('Bedrock');
        });

        it('getModelProviderName returns empty string when not configured', () => {
            const state = createState(null);
            expect(getModelProviderName(state as any)).toBe('');
        });
    });
});
