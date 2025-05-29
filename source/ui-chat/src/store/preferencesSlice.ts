// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RuntimeConfig, TextUseCaseConfig } from '../models';
import { USE_CASE_TYPES_ROUTE } from '../utils/constants';
import { RootState } from './store';

/**
 * Type definition for split panel position options
 */
type SplitPanelPosition = 'side' | 'bottom';

/**
 * Interface defining the preferences state shape
 */
export interface PreferencesState {
    navigationSideBarOpen: boolean;
    settingsPanelOpen: boolean;
    settingsPanelPosition: SplitPanelPosition;
    darkMode: boolean;
    promptTemplate: string;
}

/**
 * Loads user preferences from local storage
 * @returns Partial preferences state object from storage or empty object if none exists
 */
const loadPreferencesFromStorage = (): Partial<PreferencesState> => {
    const stored = localStorage.getItem('userPreferences');
    return stored ? JSON.parse(stored) : {};
};

/**
 * Initial preferences state with default values and any stored preferences
 */
const initialState: PreferencesState = {
    navigationSideBarOpen: false,
    settingsPanelOpen: false,
    settingsPanelPosition: 'side',
    darkMode: false,
    promptTemplate: '',
    ...loadPreferencesFromStorage()
};

/**
 * Redux slice for managing user preferences state
 */
const preferencesSlice = createSlice({
    name: 'preferences',
    initialState,
    reducers: {
        /**
         * Clears the prompt template and removes it from storage
         */
        clearPromptTemplate: (state) => {
            state.promptTemplate = '';
            const preferences = loadPreferencesFromStorage();
            if (preferences.promptTemplate) {
                delete preferences.promptTemplate;
                localStorage.setItem('userPreferences', JSON.stringify(preferences));
            }
        },
        /**
         * Sets the navigation sidebar open state
         * @param state Current state
         * @param action Action containing boolean payload
         */
        setNavigationSideBarOpen: (state, action: PayloadAction<boolean>) => {
            state.navigationSideBarOpen = action.payload;
            localStorage.setItem('userPreferences', JSON.stringify(state));
        },
        /**
         * Sets the settings panel open state
         * @param state Current state
         * @param action Action containing boolean payload
         */
        setSettingsPanelOpen: (state, action: PayloadAction<boolean>) => {
            state.settingsPanelOpen = action.payload;
            localStorage.setItem('userPreferences', JSON.stringify(state));
        },
        /**
         * Sets the settings panel position
         * @param state Current state
         * @param action Action containing position payload
         */
        setSettingsPanelPosition: (state, action: PayloadAction<SplitPanelPosition>) => {
            state.settingsPanelPosition = action.payload;
            localStorage.setItem('userPreferences', JSON.stringify(state));
        },
        /**
         * Sets the dark mode state
         * @param state Current state
         * @param action Action containing boolean payload
         */
        setDarkMode: (state, action: PayloadAction<boolean>) => {
            state.darkMode = action.payload;
            localStorage.setItem('userPreferences', JSON.stringify(state));
        },
        /**
         * Sets the prompt template
         * @param state Current state
         * @param action Action containing template string payload
         */
        setPromptTemplate: (state, action: PayloadAction<string>) => {
            state.promptTemplate = action.payload;
            localStorage.setItem('userPreferences', JSON.stringify(state));
        },
        /**
         * Initializes preferences from runtime configuration
         * @param state Current state
         * @param action Action containing runtime config payload
         */
        initializeFromRuntime: (state, action: PayloadAction<RuntimeConfig>) => {
            // Determine use case type based on socket routes
            const isTextUseCase = action.payload.SocketRoutes?.includes(USE_CASE_TYPES_ROUTE.TEXT);
            const useCaseConfig = action.payload.UseCaseConfig as TextUseCaseConfig;

            if (isTextUseCase && useCaseConfig.LlmParams?.PromptParams) {
                // Only set if not already customized by user
                if (!loadPreferencesFromStorage().promptTemplate) {
                    state.promptTemplate = (
                        action.payload.UseCaseConfig as TextUseCaseConfig
                    ).LlmParams.PromptParams.PromptTemplate;
                    localStorage.setItem('userPreferences', JSON.stringify(state));
                }
            } else {
                state.promptTemplate = '';
                const preferences = loadPreferencesFromStorage();
                if (preferences.promptTemplate) {
                    delete preferences.promptTemplate;
                    localStorage.setItem('userPreferences', JSON.stringify(preferences));
                }
            }
        }
    }
});

/**
 * Exported action creators
 */
export const {
    setNavigationSideBarOpen,
    setSettingsPanelOpen,
    setSettingsPanelPosition,
    initializeFromRuntime,
    setDarkMode,
    setPromptTemplate,
    clearPromptTemplate
} = preferencesSlice.actions;

/**
 * Selector to get prompt template from state
 * @param state Root state object
 * @returns Current prompt template
 */
export const selectPromptTemplate = (state: RootState) => state.preferences.promptTemplate;
export default preferencesSlice.reducer;
