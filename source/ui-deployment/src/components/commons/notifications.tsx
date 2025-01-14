// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useId, useState } from 'react';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import { Button } from '@cloudscape-design/components';
import { DEPLOYMENT_STATUS_NOTIFICATION } from '../../utils/constants';

function useNotifications(onSuccessButtonAction: any, status = '') {
    const [isDismissed, setDismissed] = useState(false);

    const notifications: Array<FlashbarProps.MessageDefinition> = [];
    const notificationId = useId();

    if (status === DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS && !isDismissed) {
        notifications.push({
            type: 'success',
            header: 'Success',
            content:
                'Use case deployment request submitted successfully. You can view the deployment status in the deployment dashboard.',
            dismissible: true,
            action: <Button onClick={onSuccessButtonAction}>View Deployment</Button>,
            dismissLabel: 'Dismiss message',
            onDismiss: () => setDismissed(true),
            id: notificationId
        });
    } else if (status === DEPLOYMENT_STATUS_NOTIFICATION.FAILURE && !isDismissed) {
        notifications.push({
            header: 'Error',
            type: 'error',
            content: 'Failed to deploy use case. Please contact your administrator for support.',
            statusIconAriaLabel: 'error',
            dismissLabel: 'Dismiss message',
            dismissible: true,
            onDismiss: () => setDismissed(true),
            id: notificationId
        });
    } else if (status === DEPLOYMENT_STATUS_NOTIFICATION.PENDING && !isDismissed) {
        notifications.push({
            type: 'success',
            loading: true,
            content: 'Deployment request is in progress..',
            statusIconAriaLabel: 'info',
            dismissLabel: 'Dismiss message',
            dismissible: false,
            id: notificationId
        });
    }

    return notifications;
}

export interface NotificationsProps {
    status: string;
    onSuccessButtonAction: any;
}

export function Notifications({ status, onSuccessButtonAction }: NotificationsProps) {
    const notifications = useNotifications(onSuccessButtonAction, status);
    return <Flashbar items={notifications} />;
}
