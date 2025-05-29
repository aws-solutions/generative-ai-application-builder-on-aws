// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ReadyState } from 'react-use-websocket';
import { addNotification, deleteNotification } from '../../../../store/notificationsSlice';

/**
 * Enum representing different types of connection errors that can occur
 */
export enum ConnectionErrorType {
    AUTH_TOKEN_ERROR = 'AUTH_TOKEN_ERROR',
    SOCKET_ERROR = 'SOCKET_ERROR',
    INITIALIZATION_ERROR = 'INITIALIZATION_ERROR'
}

/**
 * Interface representing the current state of the WebSocket connection
 */
export interface ConnectionState {
    socketStatus: ReadyState;
    error?: {
        type: ConnectionErrorType;
        message: string;
    };
}

/**
 * Props interface for the ConnectionStatus component
 */
interface ConnectionStatusProps {
    connectionState: ConnectionState;
    successMessageDuration?: number;
}

/**
 * Constant mapping of error types to notification IDs
 */
const NOTIFICATION_IDS = {
    CONNECTION_STATUS: 'connection-status',
    [ConnectionErrorType.AUTH_TOKEN_ERROR]: 'auth-error',
    [ConnectionErrorType.SOCKET_ERROR]: 'socket-error',
    [ConnectionErrorType.INITIALIZATION_ERROR]: 'initialization-error'
} as const;

/**
 * Mapping of error types to user-friendly error messages
 */
const errorMessages: Record<ConnectionErrorType, string> = {
    [ConnectionErrorType.AUTH_TOKEN_ERROR]: 'Failed to authenticate. Please try refreshing the page.',
    [ConnectionErrorType.SOCKET_ERROR]: 'Connection error. Please check your internet connection.',
    [ConnectionErrorType.INITIALIZATION_ERROR]: 'Failed to initialize chat service.'
};

/**
 * Mapping of WebSocket ready states to user-friendly status messages
 */
const statusMessages = {
    [ReadyState.CONNECTING]: 'Connecting to chat service...',
    [ReadyState.OPEN]: 'Connected to chat service',
    [ReadyState.CLOSING]: 'Disconnecting from chat service...',
    [ReadyState.CLOSED]: 'Disconnected - Attempting to reconnect...',
    [ReadyState.UNINSTANTIATED]: 'Initializing connection...'
};

/**
 * Component that manages and displays WebSocket connection status notifications
 * @param connectionState - Current state of the WebSocket connection
 * @param successMessageDuration - Duration in ms to show success notifications (default: 2000)
 * @returns null - This is a purely logical component with no UI
 */
export const ConnectionStatus = memo(({ connectionState, successMessageDuration = 2000 }: ConnectionStatusProps) => {
    const dispatch = useDispatch();
    const { socketStatus, error } = connectionState;

    useEffect(() => {
        if (error) {
            const errorNotificationId = NOTIFICATION_IDS[error.type as ConnectionErrorType];

            dispatch(
                addNotification({
                    id: errorNotificationId,
                    header: 'Connection Error',
                    content: errorMessages[error.type] || error.message,
                    type: 'error'
                })
            );
        } else {
            const notificationType =
                socketStatus === ReadyState.OPEN
                    ? 'success'
                    : socketStatus === ReadyState.CONNECTING
                      ? 'info'
                      : 'warning';

            dispatch(
                addNotification({
                    id: NOTIFICATION_IDS.CONNECTION_STATUS,
                    header: 'Connection Status',
                    content: statusMessages[socketStatus],
                    type: notificationType
                })
            );

            // Auto-dismiss success messages
            if (socketStatus === ReadyState.OPEN) {
                const timeoutId = setTimeout(() => {
                    dispatch(deleteNotification({ id: NOTIFICATION_IDS.CONNECTION_STATUS }));
                }, successMessageDuration);
                return () => clearTimeout(timeoutId);
            }
        }

        // Cleanup function
        return () => {
            Object.values(NOTIFICATION_IDS).forEach((id) => {
                dispatch(deleteNotification({ id }));
            });
        };
    }, [socketStatus, error, dispatch, successMessageDuration]);

    return null;
});
