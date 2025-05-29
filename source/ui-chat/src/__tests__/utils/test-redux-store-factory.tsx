// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Provider } from 'react-redux';

import { render, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { ConfigState } from '../../store/configSlice';
import { PreferencesState } from '../../store/preferencesSlice';
import { NotificationState } from '../../store/notificationsSlice';
import { RootState, setupStore } from '../../store/store';

import { DEFAULT_AGENT_CONFIG, DEFAULT_TEXT_CONFIG } from './test-configs';
import { RuntimeConfig } from '../../models';

/**
 * Utility type that makes all properties in an object type optional recursively
 * @template T - The type to make deeply partial
 * @example
 * interface User {
 *   name: string;
 *   address: {
 *     street: string;
 *     city: string;
 *   }
 * }
 *
 * // Results in type where all properties are optional:
 * type PartialUser = DeepPartial<User>;
 */
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Base factory interface
interface MockStateFactory<T> {
    create(overrides?: Partial<T>): T;
    createPartial(overrides?: Partial<T>): Partial<T>;
}

// Config State Factory
export class ConfigStateFactory implements MockStateFactory<ConfigState> {
    private getDefaultRuntimeConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
        const useCaseType = overrides?.UseCaseConfig?.UseCaseType || 'Text';
        const baseConfig = useCaseType === 'Agent' ? DEFAULT_AGENT_CONFIG : DEFAULT_TEXT_CONFIG;

        return {
            ...baseConfig,
            ...overrides,
            UseCaseConfig: {
                ...baseConfig.UseCaseConfig,
                ...(overrides?.UseCaseConfig || {})
            }
        } as RuntimeConfig;
    }

    private defaultState: ConfigState = {
        runtimeConfig: { ...DEFAULT_TEXT_CONFIG } as RuntimeConfig,
        loading: false,
        error: null
    };

    create(overrides: Partial<ConfigState> = {}): ConfigState {
        if (overrides.runtimeConfig) {
            return {
                ...this.defaultState,
                ...overrides,
                runtimeConfig: this.getDefaultRuntimeConfig(overrides.runtimeConfig)
            };
        }

        return {
            ...this.defaultState,
            ...overrides
        };
    }

    createPartial(overrides: Partial<ConfigState> = {}): Partial<ConfigState> {
        return this.create(overrides);
    }

    createRuntimeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
        return this.getDefaultRuntimeConfig(overrides);
    }
}

// Preferences State Factory
export class PreferencesStateFactory implements MockStateFactory<PreferencesState> {
    private defaultState: PreferencesState = {
        navigationSideBarOpen: true,
        settingsPanelOpen: false,
        settingsPanelPosition: 'side',
        darkMode: false,
        promptTemplate: ''
    };

    create(overrides: Partial<PreferencesState> = {}): PreferencesState {
        return {
            ...this.defaultState,
            ...overrides
        };
    }

    createPartial(overrides: Partial<PreferencesState> = {}): Partial<PreferencesState> {
        return this.create(overrides);
    }
}

export class NotificationsStateFactory implements MockStateFactory<NotificationState> {
    private defaultState: NotificationState = {
        notifications: []
    };

    create(overrides: Partial<NotificationState> = {}): NotificationState {
        return {
            ...this.defaultState,
            ...overrides
        };
    }

    createPartial(overrides: Partial<NotificationState> = {}): Partial<NotificationState> {
        return this.create(overrides);
    }
}

// Store Factory that combines all slice factories
export class TestStoreFactory {
    private configFactory: ConfigStateFactory;
    private preferencesFactory: PreferencesStateFactory;
    private notificationsFactory: NotificationsStateFactory;

    constructor() {
        this.configFactory = new ConfigStateFactory();
        this.preferencesFactory = new PreferencesStateFactory();
        this.notificationsFactory = new NotificationsStateFactory();
    }

    createState(overrides: Partial<RootState> = {}): Partial<RootState> {
        return {
            config: this.configFactory.create(overrides.config),
            preferences: this.preferencesFactory.create(overrides.preferences),
            notifications: this.notificationsFactory.create(overrides.notifications),
            ...overrides
        };
    }

    createStore(overrides: Partial<RootState> = {}) {
        return setupStore(this.createState(overrides));
    }

    renderWithStore<T extends React.ReactElement>(ui: T, stateOverrides: DeepPartial<RootState> = {}) {
        const store = this.createStore(stateOverrides as RootState);

        const Wrapper = ({ children }: PropsWithChildren<{}>) => <Provider store={store}>{children}</Provider>;

        return {
            store,
            ...render(ui, { wrapper: Wrapper })
        };
    }

    renderHookWithStore(hook: any, stateOverrides: Partial<RootState> = {}) {
        const store = this.createStore(stateOverrides);

        const wrapper = ({ children }: PropsWithChildren<{}>) => <Provider store={store}>{children}</Provider>;

        return {
            store,
            ...renderHook(hook, { wrapper })
        };
    }
}

// Export a singleton instance
export const testStoreFactory = new TestStoreFactory();

// Export factory instances for individual use
export const configFactory = new ConfigStateFactory();
export const preferencesFactory = new PreferencesStateFactory();
export const notificationsFactory = new NotificationsStateFactory();
