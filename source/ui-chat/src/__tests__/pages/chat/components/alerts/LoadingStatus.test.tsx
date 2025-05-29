// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { testStoreFactory } from '../../../../utils/test-redux-store-factory';
import { LoadingStatus, LoadingErrorType } from '@/pages/chat/components/alerts/LoadingStatus';

describe('LoadingStatus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('dispatches info notification when loading', () => {
        const { store } = testStoreFactory.renderWithStore(
            <LoadingStatus
                loadingState={{
                    isLoading: true,
                    error: undefined
                }}
                loadingMessage="Test loading message"
            />
        );

        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                id: 'loading-status',
                type: 'info',
                content: 'Test loading message'
            })
        );
    });

    test('dispatches error notification when data fetch error occurs', () => {
        const { store } = testStoreFactory.renderWithStore(
            <LoadingStatus
                loadingState={{
                    isLoading: false,
                    error: {
                        type: LoadingErrorType.DATA_FETCH_ERROR,
                        message: 'Failed to fetch data'
                    }
                }}
                loadingMessage="Test loading message"
            />
        );

        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                id: 'data-fetch-error',
                type: 'error',
                content: 'Failed to fetch data'
            })
        );
    });

    test('does not show notification when not loading and no error', () => {
        const { store } = testStoreFactory.renderWithStore(
            <LoadingStatus
                loadingState={{
                    isLoading: false,
                    error: undefined
                }}
                loadingMessage="Test loading message"
            />
        );

        expect(store.getState().notifications.notifications).not.toContainEqual(
            expect.objectContaining({
                id: 'loading-status'
            })
        );
    });

    test('transitions from loading to error state', () => {
        const { store, rerender } = testStoreFactory.renderWithStore(
            <LoadingStatus
                loadingState={{
                    isLoading: true,
                    error: undefined
                }}
                loadingMessage="Test loading message"
            />
        );

        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                id: 'loading-status',
                type: 'info'
            })
        );

        rerender(
            <LoadingStatus
                loadingState={{
                    isLoading: false,
                    error: {
                        type: LoadingErrorType.DATA_FETCH_ERROR,
                        message: 'Failed to fetch data'
                    }
                }}
                loadingMessage="Test loading message"
            />
        );

        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                'content': 'Failed to fetch data',
                'header': 'Error',
                'id': 'data-fetch-error',
                'type': 'error'
            })
        );
    });
});
