// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReadyState } from 'react-use-websocket';

import { testStoreFactory } from '../../../../utils/test-redux-store-factory';
import { ConnectionErrorType, ConnectionStatus } from '../../../../../pages/chat/components/alerts/ConnectionStatus';

describe('ConnectionStatus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('dispatches success notification when connection is open', () => {
        const { store } = testStoreFactory.renderWithStore(
            <ConnectionStatus
                connectionState={{
                    socketStatus: ReadyState.OPEN
                }}
            />
        );

        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                id: 'connection-status',
                type: 'success',
                content: 'Connected to chat service'
            })
        );
    });

    test('auto-dismisses success notification after specified duration', () => {
        const successMessageDuration = 1000;
        const { store } = testStoreFactory.renderWithStore(
            <ConnectionStatus
                connectionState={{
                    socketStatus: ReadyState.OPEN
                }}
                successMessageDuration={successMessageDuration}
            />
        );

        // Check notification exists before timeout
        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                id: 'connection-status'
            })
        );

        vi.advanceTimersByTime(successMessageDuration);

        // Check notification is removed after timeout
        expect(store.getState().notifications.notifications).not.toContainEqual(
            expect.objectContaining({
                id: 'connection-status'
            })
        );
    });

    test('dispatches error notification when auth error occurs', () => {
        const { store } = testStoreFactory.renderWithStore(
            <ConnectionStatus
                connectionState={{
                    socketStatus: ReadyState.CLOSED,
                    error: {
                        type: ConnectionErrorType.AUTH_TOKEN_ERROR,
                        message: 'Authentication failed'
                    }
                }}
            />
        );

        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                id: 'auth-error',
                type: 'error',
                content: 'Failed to authenticate. Please try refreshing the page.'
            })
        );
    });

    test('dispatches error notification when socket error occurs', () => {
        const { store } = testStoreFactory.renderWithStore(
            <ConnectionStatus
                connectionState={{
                    socketStatus: ReadyState.CLOSED,
                    error: {
                        type: ConnectionErrorType.SOCKET_ERROR,
                        message: 'Connection failed'
                    }
                }}
            />
        );

        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                id: 'socket-error',
                type: 'error',
                content: 'Connection error. Please check your internet connection.'
            })
        );
    });

    test('dispatches info notification when connecting', () => {
        const { store } = testStoreFactory.renderWithStore(
            <ConnectionStatus
                connectionState={{
                    socketStatus: ReadyState.CONNECTING
                }}
            />
        );

        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                id: 'connection-status',
                type: 'info',
                content: 'Connecting to chat service...'
            })
        );
    });

    test('dispatches warning notification when closed', () => {
        const { store } = testStoreFactory.renderWithStore(
            <ConnectionStatus
                connectionState={{
                    socketStatus: ReadyState.CLOSED
                }}
            />
        );

        expect(store.getState().notifications.notifications).toContainEqual(
            expect.objectContaining({
                id: 'connection-status',
                type: 'warning',
                content: 'Disconnected - Attempting to reconnect...'
            })
        );
    });
});
