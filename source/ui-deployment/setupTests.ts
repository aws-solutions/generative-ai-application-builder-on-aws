// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import '@testing-library/jest-dom';
import { beforeAll, vi } from 'vitest';
import { Auth } from 'aws-amplify';
import { mockedAuthenticator } from './src/utils/test-utils';

globalThis.jest = vi;

vi.mock('aws-amplify');
beforeAll(() => {
    Auth.currentAuthenticatedUser = mockedAuthenticator();
});

// Some Cloudscape components import scoped CSS which Vite/Vitest may try to load via fetch().
// In CI/sandbox this can intermittently time out, causing unrelated tests to fail.
// Stub fetch for CSS assets to return an empty response quickly.
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
    try {
        const url = typeof input === 'string' ? input : input?.toString?.() ?? '';
        if (url.includes('.css')) {
            return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
        }
    } catch {
        // fall through
    }
    return originalFetch(input as any, init as any);
}) as any;
