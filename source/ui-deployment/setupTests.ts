// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import '@testing-library/jest-dom';
import { beforeAll, vi } from 'vitest';
import { Auth } from 'aws-amplify';
import { mockedAuthenticator } from './src/utils/test-utils';

globalThis.jest = vi;

// Provide localStorage mock for test environments where jsdom doesn't expose it as a function
if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            Object.keys(store).forEach((key) => delete store[key]);
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index: number) => Object.keys(store)[index] ?? null
    };
}

vi.mock('aws-amplify');
beforeAll(() => {
    Auth.currentAuthenticatedUser = mockedAuthenticator();
});
