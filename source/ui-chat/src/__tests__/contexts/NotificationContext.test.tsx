// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotificationContext, NotificationContextProvider } from '../../contexts/NotificationContext';
import { testStoreFactory } from '../utils/test-redux-store-factory';
import { Provider } from 'react-redux';
import { useContext } from 'react';
import { FlashbarProps } from '@cloudscape-design/components';

describe('NotificationContext', () => {
    // Create a wrapper that provides both Redux store and NotificationProvider
    const createWrapper = (stateOverrides = {}) => {
        const store = testStoreFactory.createStore(stateOverrides);
        return ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>
                <NotificationContextProvider>{children}</NotificationContextProvider>
            </Provider>
        );
    };

    const useNotifications = () => useContext(NotificationContext);

    it('should provide empty notifications array by default', () => {
        const { result } = renderHook(() => useNotifications(), {
            wrapper: createWrapper()
        });

        expect(result.current.notifications).toEqual([]);
    });

    it('should provide notifications from the store with dismiss handlers', () => {
        const mockNotifications = [
            {
                id: '1',
                type: 'success',
                content: 'Test notification'
            }
        ];

        const { result } = renderHook(() => useNotifications(), {
            wrapper: createWrapper({
                notifications: {
                    notifications: mockNotifications
                }
            })
        });

        const resultNotifications = result.current.notifications;
        expect(resultNotifications).toHaveLength(1);
        expect(resultNotifications[0]).toEqual(
            expect.objectContaining({
                id: '1',
                type: 'success',
                content: 'Test notification',
                dismissible: true,
                onDismiss: expect.any(Function)
            })
        );
    });

    it('should handle notification dismissal', async () => {
        const mockNotifications = [
            {
                id: '1',
                type: 'success',
                content: 'Test notification'
            }
        ];

        const { result } = renderHook(() => useNotifications(), {
            wrapper: createWrapper({
                notifications: {
                    notifications: mockNotifications
                }
            })
        });

        expect(result.current.notifications).toHaveLength(1);

        // Dismiss the notification
        await act(async () => {
            const notification = result.current.notifications[0] as FlashbarProps.MessageDefinition;
            notification.onDismiss?.({} as CustomEvent);
        });

        // The notification should be removed from the state
        expect(result.current.notifications).toHaveLength(0);
    });

    it('should update notifications when store changes', () => {
        const { result, rerender } = renderHook(() => useNotifications(), {
            wrapper: createWrapper({
                notifications: {
                    notifications: []
                }
            })
        });

        expect(result.current.notifications).toHaveLength(0);

        // Update the store with new notifications
        rerender();

        const mockNotifications = [
            {
                id: '1',
                type: 'success',
                content: 'New notification'
            }
        ];

        const { result: newResult } = renderHook(() => useNotifications(), {
            wrapper: createWrapper({
                notifications: {
                    notifications: mockNotifications
                }
            })
        });

        expect(newResult.current.notifications).toHaveLength(1);
        expect(newResult.current.notifications[0]).toEqual(
            expect.objectContaining({
                id: '1',
                type: 'success',
                content: 'New notification'
            })
        );
    });
});
