// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useId, useState } from 'react';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import { DEPLOYMENT_STATUS_NOTIFICATION } from '../../utils/constants';

function useNotifications(status = '') {
    const [isDismissed, setDismissed] = useState(false);

    const notifications: Array<FlashbarProps.MessageDefinition> = [];
    const notificationId = useId();

    if (status === DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS && !isDismissed) {
        notifications.push({
            type: 'success',
            header: 'Success',
            content: 'Delete request submitted.',
            dismissible: true,
            dismissLabel: 'Dismiss message',
            onDismiss: () => setDismissed(true),
            id: notificationId
        });
    } else if (status === DEPLOYMENT_STATUS_NOTIFICATION.FAILURE && !isDismissed) {
        notifications.push({
            header: 'Error',
            type: 'error',
            content: 'Failed to delete usecase',
            statusIconAriaLabel: 'error',
            dismissLabel: 'Dismiss message',
            dismissible: false,
            id: notificationId
        });
    } else if (status === DEPLOYMENT_STATUS_NOTIFICATION.PENDING && !isDismissed) {
        notifications.push({
            type: 'success',
            loading: true,
            content: 'Delete request is in progress..',
            statusIconAriaLabel: 'info',
            dismissLabel: 'Dismiss message',
            dismissible: false,
            id: notificationId
        });
    }

    return notifications;
}

export interface DeleteNotificationsProps {
    status: string;
}

export function DeleteNotifications({ status }: DeleteNotificationsProps) {
    const notifications = useNotifications(status);
    return <Flashbar items={notifications} />;
}
