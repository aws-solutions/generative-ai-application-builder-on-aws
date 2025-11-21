// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Flashbar, FlashbarProps, Button } from '@cloudscape-design/components';
import { NotificationItem } from '../../hooks/useNotifications';

export interface NotificationsProps {
    notifications: NotificationItem[];
    onDismiss: (id: string) => void;
    stackItems?: boolean;
    maxItems?: number;
}

export const Notifications: React.FC<NotificationsProps> = ({
    notifications,
    onDismiss,
    stackItems = false,
    maxItems
}) => {
    const displayNotifications = maxItems ? notifications.slice(-maxItems) : notifications;

    const flashbarItems: FlashbarProps.MessageDefinition[] = displayNotifications.map((notification) => ({
        type: notification.type,
        header: notification.header,
        content: notification.content,
        dismissible: notification.dismissible ?? true,
        dismissLabel: 'Dismiss notification',
        onDismiss: () => onDismiss(notification.id),
        loading: notification.loading,
        action: notification.action ? (
            <Button onClick={notification.action.onClick} variant="normal">
                {notification.action.text}
            </Button>
        ) : undefined,
        id: notification.id
    }));

    if (flashbarItems.length === 0) {
        return null;
    }

    return <Flashbar items={flashbarItems} stackItems={stackItems} />;
};

export default Notifications;
