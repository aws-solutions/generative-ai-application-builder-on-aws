// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import preferencesReducer, {
    setNavigationSideBarOpen,
    setSettingsPanelOpen,
    setSettingsPanelPosition,
    setDarkMode,
    setPromptTemplate,
    clearPromptTemplate,
    initializeFromRuntime,
    selectPromptTemplate,
    PreferencesState
} from '@store/preferencesSlice';
import { RuntimeConfig } from '../../models';
import { USE_CASE_TYPES_ROUTE } from '../../utils/constants';

describe('preferencesSlice', () => {
    let initialState: PreferencesState;

    beforeEach(() => {
        localStorage.clear();
        initialState = {
            navigationSideBarOpen: false,
            settingsPanelOpen: false,
            settingsPanelPosition: 'side',
            darkMode: false,
            promptTemplate: ''
        };
    });

    describe('reducers', () => {
        it('should return the initial state', () => {
            const state = preferencesReducer(undefined, { type: 'unknown' });
            expect(state.navigationSideBarOpen).toBe(false);
            expect(state.settingsPanelOpen).toBe(false);
            expect(state.settingsPanelPosition).toBe('side');
            expect(state.darkMode).toBe(false);
        });

        it('should handle setNavigationSideBarOpen', () => {
            const state = preferencesReducer(initialState, setNavigationSideBarOpen(true));
            expect(state.navigationSideBarOpen).toBe(true);
        });

        it('should persist setNavigationSideBarOpen to localStorage', () => {
            preferencesReducer(initialState, setNavigationSideBarOpen(true));
            const stored = JSON.parse(localStorage.getItem('userPreferences')!);
            expect(stored.navigationSideBarOpen).toBe(true);
        });

        it('should handle setSettingsPanelOpen', () => {
            const state = preferencesReducer(initialState, setSettingsPanelOpen(true));
            expect(state.settingsPanelOpen).toBe(true);
        });

        it('should handle setSettingsPanelPosition', () => {
            const state = preferencesReducer(initialState, setSettingsPanelPosition('bottom'));
            expect(state.settingsPanelPosition).toBe('bottom');
        });

        it('should handle setDarkMode', () => {
            const state = preferencesReducer(initialState, setDarkMode(true));
            expect(state.darkMode).toBe(true);
        });

        it('should handle setPromptTemplate', () => {
            const state = preferencesReducer(initialState, setPromptTemplate('Hello {input}'));
            expect(state.promptTemplate).toBe('Hello {input}');
        });

        it('should handle clearPromptTemplate', () => {
            const stateWithPrompt = { ...initialState, promptTemplate: 'some template' };
            localStorage.setItem('userPreferences', JSON.stringify(stateWithPrompt));
            const state = preferencesReducer(stateWithPrompt, clearPromptTemplate());
            expect(state.promptTemplate).toBe('');
        });

        it('should handle clearPromptTemplate when no stored prompt exists', () => {
            localStorage.setItem('userPreferences', JSON.stringify({ darkMode: true }));
            const state = preferencesReducer(initialState, clearPromptTemplate());
            expect(state.promptTemplate).toBe('');
        });
    });

    describe('initializeFromRuntime', () => {
        it('should set prompt template from text use case config', () => {
            const runtimeConfig = {
                SocketRoutes: [USE_CASE_TYPES_ROUTE.TEXT],
                UseCaseConfig: {
                    LlmParams: {
                        PromptParams: {
                            PromptTemplate: 'Runtime prompt template'
                        }
                    }
                }
            } as unknown as RuntimeConfig;

            const state = preferencesReducer(initialState, initializeFromRuntime(runtimeConfig));
            expect(state.promptTemplate).toBe('Runtime prompt template');
        });

        it('should not override user-customized prompt template', () => {
            localStorage.setItem('userPreferences', JSON.stringify({ promptTemplate: 'user custom' }));
            const runtimeConfig = {
                SocketRoutes: [USE_CASE_TYPES_ROUTE.TEXT],
                UseCaseConfig: {
                    LlmParams: {
                        PromptParams: {
                            PromptTemplate: 'Runtime prompt template'
                        }
                    }
                }
            } as unknown as RuntimeConfig;

            const stateWithUserPrompt = { ...initialState, promptTemplate: 'user custom' };
            const state = preferencesReducer(stateWithUserPrompt, initializeFromRuntime(runtimeConfig));
            expect(state.promptTemplate).toBe('user custom');
        });

        it('should clear prompt template for non-text use cases', () => {
            const stateWithPrompt = { ...initialState, promptTemplate: 'old template' };
            const runtimeConfig = {
                SocketRoutes: ['/agent'],
                UseCaseConfig: {}
            } as unknown as RuntimeConfig;

            const state = preferencesReducer(stateWithPrompt, initializeFromRuntime(runtimeConfig));
            expect(state.promptTemplate).toBe('');
        });

        it('should clear prompt template when text use case has no PromptParams', () => {
            const stateWithPrompt = { ...initialState, promptTemplate: 'old template' };
            const runtimeConfig = {
                SocketRoutes: [USE_CASE_TYPES_ROUTE.TEXT],
                UseCaseConfig: {
                    LlmParams: {}
                }
            } as unknown as RuntimeConfig;

            const state = preferencesReducer(stateWithPrompt, initializeFromRuntime(runtimeConfig));
            expect(state.promptTemplate).toBe('');
        });
    });

    describe('selectors', () => {
        it('selectPromptTemplate returns the prompt template', () => {
            const state = {
                preferences: { ...initialState, promptTemplate: 'test template' }
            } as any;
            expect(selectPromptTemplate(state)).toBe('test template');
        });
    });
});
