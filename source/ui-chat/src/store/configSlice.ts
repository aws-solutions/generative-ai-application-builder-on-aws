// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RuntimeConfig, TextUseCaseConfig, UseCaseType, AgentUseCaseConfig } from '../models';
import { RootState } from './store';
import { DEFAULT_CHAT_INPUT_MAX_LENGTH, MAX_PROMPT_TEMPLATE_LENGTH, USE_CASE_TYPES } from '../utils/constants';

/**
 * Interface representing the configuration state
 */
export interface ConfigState {
    runtimeConfig: RuntimeConfig | null;
    loading: boolean;
    error: string | null;
}

/**
 * Initial configuration state with null values
 */
const initialState: ConfigState = {
    runtimeConfig: null,
    loading: false,
    error: null
};

/**
 * Redux slice for managing configuration state
 */
export const configSlice = createSlice({
    name: 'config',
    initialState,
    reducers: {
        /**
         * Sets the runtime configuration and updates use case type
         * @param state Current state
         * @param action Payload containing RuntimeConfig
         */
        setRuntimeConfig: (state, action: PayloadAction<RuntimeConfig>) => {
            state.runtimeConfig = {
                ...action.payload
            };
            state.loading = false;
            state.error = null;
        },
        /**
         * Sets the loading state
         * @param state Current state
         * @param action Payload containing boolean loading value
         */
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        /**
         * Sets the error state and disables loading
         * @param state Current state
         * @param action Payload containing error message
         */
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.loading = false;
        },
        /**
         * Sets the use case config
         * @param state Current state
         * @param action Payload containing error message
         */
        setUseCaseConfig: (state, action: PayloadAction<AgentUseCaseConfig | TextUseCaseConfig>) => {
            state.runtimeConfig = {
                ...state.runtimeConfig,
                UseCaseConfig: action.payload
            } as RuntimeConfig;
        }
    }
});

export const { setUseCaseConfig, setRuntimeConfig, setLoading, setError } = configSlice.actions;

/**
 * Selects the default prompt template from state
 * @param state Root application state
 * @returns Default prompt template string
 */
export const selectDefaultPromptTemplate = (state: RootState) => {
    const useCaseConfig = state.config.runtimeConfig?.UseCaseConfig as TextUseCaseConfig;
    return useCaseConfig?.LlmParams?.PromptParams?.PromptTemplate || '';
};

/**
 * Selects the use case type from state
 * @param state Root application state
 * @returns Current use case type
 */
export const selectUseCaseType = (state: RootState): UseCaseType =>
    (state.config.runtimeConfig?.UseCaseConfig?.UseCaseType as UseCaseType) || (USE_CASE_TYPES.TEXT as UseCaseType);

/**
 * Gets the maximum prompt template length from state
 * @param state Root application state
 * @returns Maximum allowed prompt template length
 */
export const getPromptTemplateLength = (state: RootState): number => {
    const useCaseConfig = state.config.runtimeConfig?.UseCaseConfig as TextUseCaseConfig;
    return useCaseConfig?.LlmParams?.PromptParams?.MaxPromptTemplateLength ?? MAX_PROMPT_TEMPLATE_LENGTH;
};

/**
 * Gets the maximum input text length from state
 * @param state Root application state
 * @returns Maximum allowed input text length
 */
export const getMaxInputTextLength = (state: RootState): number => {
    const useCaseConfig = state.config.runtimeConfig?.UseCaseConfig;
    if (useCaseConfig?.UseCaseType === USE_CASE_TYPES.AGENT) {
        return DEFAULT_CHAT_INPUT_MAX_LENGTH;
    }
    const textConfig = useCaseConfig as TextUseCaseConfig;
    return textConfig?.LlmParams?.PromptParams?.MaxInputTextLength ?? DEFAULT_CHAT_INPUT_MAX_LENGTH;
};

/**
 * Gets the RAG enabled state
 * @param state Root application state
 * @returns Boolean indicating if RAG is enabled
 */
export const getRagEnabledState = (state: RootState): boolean => {
    const useCaseConfig = state.config.runtimeConfig?.UseCaseConfig as TextUseCaseConfig;
    return useCaseConfig?.LlmParams?.RAGEnabled;
};

/**
 * Gets the use case ID from the runtime config
 * @param state Root application state
 * @returns Use case ID string or empty string if not found
 */
export const getUseCaseId = (state: RootState): string => {
    return state.config.runtimeConfig?.UseCaseId || '';
};

/**
 * Gets the use case configuration key from the runtime config
 * @param state Root application state
 * @returns Use case configuration key string or empty string if not found
 */
export const getUseCaseConfigKey = (state: RootState): string => {
    return state.config.runtimeConfig?.UseCaseConfigKey || '';
};

/**
 * Gets the use case configuration from the runtime config
 * @param state Root application state
 * @returns The use case configuration object (either AgentUseCaseConfig or TextUseCaseConfig) or undefined if not found
 */
export const getUseCaseConfig = (state: RootState): AgentUseCaseConfig | TextUseCaseConfig | undefined => {
    return state.config.runtimeConfig?.UseCaseConfig;
};

/**
 * Gets the feedback enabled state from the runtime config
 * @param state Root application state
 * @returns Boolean indicating if feedback is enabled
 */
export const getFeedbackEnabledState = (state: RootState): any => {
    return state.config.runtimeConfig?.UseCaseConfig?.FeedbackParams?.FeedbackEnabled ?? false;
};

/**
 * Gets the model provider name from the runtime config
 * @param state Root application state
 * @returns Model provider name string or empty string if not found
 */
export const getModelProviderName = (state: RootState): string => {
    return (state.config.runtimeConfig?.UseCaseConfig as TextUseCaseConfig)?.ModelProviderName ?? '';
};

export default configSlice.reducer;
