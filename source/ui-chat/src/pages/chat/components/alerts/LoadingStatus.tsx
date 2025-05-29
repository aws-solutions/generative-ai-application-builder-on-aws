// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification, deleteNotification } from '@/store/notificationsSlice';

/**
 * Enum representing different types of loading errors that can occur
 */
export enum LoadingErrorType {
    DATA_FETCH_ERROR = 'DATA_FETCH_ERROR'
}

/**
 * Interface representing the current state of loading
 */
export interface LoadingState {
    isLoading: boolean;
    error?: {
        type: LoadingErrorType;
        message: string;
    };
}

/**
 * Props interface for the LoadingStatus component
 */
interface LoadingStatusProps {
    loadingState: LoadingState;
    loadingMessage?: string;
    successMessageDuration?: number;
}

/**
 * Constant mapping of notification IDs
 */
const NOTIFICATION_IDS = {
    LOADING_STATUS: 'loading-status',
    [LoadingErrorType.DATA_FETCH_ERROR]: 'data-fetch-error'
} as const;

/**
 * Mapping of error types to user-friendly error messages
 */
const errorMessages: Record<LoadingErrorType, string> = {
    [LoadingErrorType.DATA_FETCH_ERROR]: 'Failed to fetch data. Please try again or contact a system administrator.'
};

/**
 * Component that manages and displays loading status notifications
 * @param loadingState - Current state of loading
 * @param loadingMessage - Custom loading message (optional)
 * @param successMessageDuration - Duration in ms to show success notifications (default: 2000)
 */
export const LoadingStatus = memo(
    ({ loadingState, loadingMessage = 'Loading...', successMessageDuration = 2000 }: LoadingStatusProps) => {
        const dispatch = useDispatch();
        const { isLoading, error } = loadingState;

        useEffect(() => {
            if (error) {
                const errorNotificationId = NOTIFICATION_IDS[error.type as LoadingErrorType];

                dispatch(
                    addNotification({
                        id: errorNotificationId,
                        header: 'Error',
                        content: error.message ?? errorMessages[error.type],
                        type: 'error'
                    })
                );
            } else if (isLoading) {
                dispatch(
                    addNotification({
                        id: NOTIFICATION_IDS.LOADING_STATUS,
                        header: 'Loading',
                        content: loadingMessage,
                        type: 'info'
                    })
                );
            } else {
                // Clear loading notification
                dispatch(deleteNotification({ id: NOTIFICATION_IDS.LOADING_STATUS }));

                // Show success message briefly
                dispatch(
                    addNotification({
                        id: 'load-success',
                        header: 'Success',
                        content: 'Loaded successfully',
                        type: 'success'
                    })
                );

                const timeoutId = setTimeout(() => {
                    dispatch(deleteNotification({ id: 'load-success' }));
                }, successMessageDuration);

                return () => clearTimeout(timeoutId);
            }

            // Cleanup function
            return () => {
                Object.values(NOTIFICATION_IDS).forEach((id) => {
                    dispatch(deleteNotification({ id }));
                });
            };
        }, [isLoading, error, dispatch, loadingMessage, successMessageDuration]);

        return null;
    }
);

export default LoadingStatus;
