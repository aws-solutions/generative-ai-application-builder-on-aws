// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';

export interface NotificationItem {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    header: string;
    content: string;
    dismissible?: boolean;
    loading?: boolean;
    action?: {
        text: string;
        onClick: () => void;
    };
    autoDismiss?: boolean;
    autoDismissTimeout?: number;
}

export interface NotificationOptions {
    autoDismiss?: boolean;
    autoDismissTimeout?: number;
    dismissible?: boolean;
    loading?: boolean;
    action?: {
        text: string;
        onClick: () => void;
    };
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    const addNotification = (notification: Omit<NotificationItem, 'id'>) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const newNotification = { ...notification, id };

        setNotifications((prev) => [...prev, newNotification]);

        const shouldAutoDismiss =
            notification.autoDismiss ?? (notification.type === 'success' && notification.dismissible !== false);
        const timeout = notification.autoDismissTimeout ?? 5000;

        if (shouldAutoDismiss) {
            setTimeout(() => {
                setNotifications((prev) => prev.filter((n) => n.id !== id));
            }, timeout);
        }

        return id;
    };

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const clearAllNotifications = () => {
        setNotifications([]);
    };

    const addSuccessNotification = (content: string, header: string = 'Success', options: NotificationOptions = {}) => {
        return addNotification({
            type: 'success',
            header,
            content,
            dismissible: options.dismissible ?? true,
            autoDismiss: options.autoDismiss ?? true,
            autoDismissTimeout: options.autoDismissTimeout ?? 5000,
            ...options
        });
    };

    const addErrorNotification = (content: string, header: string = 'Error', options: NotificationOptions = {}) => {
        return addNotification({
            type: 'error',
            header,
            content,
            dismissible: options.dismissible ?? true,
            autoDismiss: options.autoDismiss ?? false,
            ...options
        });
    };

    const addWarningNotification = (content: string, header: string = 'Warning', options: NotificationOptions = {}) => {
        return addNotification({
            type: 'warning',
            header,
            content,
            dismissible: options.dismissible ?? true,
            autoDismiss: options.autoDismiss ?? false,
            ...options
        });
    };

    const addInfoNotification = (
        content: string,
        header: string = 'Information',
        options: NotificationOptions = {}
    ) => {
        return addNotification({
            type: 'info',
            header,
            content,
            dismissible: options.dismissible ?? true,
            autoDismiss: options.autoDismiss ?? false,
            ...options
        });
    };

    const addLoadingNotification = (
        content: string,
        header: string = 'Processing',
        options: Omit<NotificationOptions, 'loading' | 'dismissible'> = {}
    ) => {
        return addNotification({
            type: 'info',
            header,
            content,
            dismissible: false,
            loading: true,
            autoDismiss: false,
            ...options
        });
    };

    return {
        notifications,
        addNotification,
        removeNotification,
        clearAllNotifications,
        addSuccessNotification,
        addErrorNotification,
        addWarningNotification,
        addInfoNotification,
        addLoadingNotification
    };
}
