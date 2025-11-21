// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useId, useState, useEffect } from 'react';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import { Button } from '@cloudscape-design/components';
import { DEPLOYMENT_STATUS_NOTIFICATION } from '../../utils/constants';

function useNotifications(onSuccessButtonAction: any, status = '', schemaUploadErrorMessage = '', fileCount = 0) {
    const [isDismissed, setDismissed] = useState(false);
    const [lastStatus, setLastStatus] = useState(status);

    // Reset dismissed state when status changes
    useEffect(() => {
        if (status !== lastStatus) {
            setDismissed(false);
            setLastStatus(status);
        }
    }, [status, lastStatus]);

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
    } else if (status === DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_PENDING && !isDismissed) {
        const isPlural = fileCount !== 1;
        const fileText = isPlural ? 'files' : 'file';
        notifications.push({
            type: 'info',
            loading: true,
            content: `MCP schema ${fileText} ${isPlural ? 'are' : 'is'} being uploaded...`,
            header: `Uploading Schema ${isPlural ? 'Files' : 'File'}`,
            statusIconAriaLabel: 'info',
            dismissLabel: 'Dismiss message',
            dismissible: false,
            id: notificationId
        });
    } else if (status === DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE && !isDismissed) {
        const errorContent =
            schemaUploadErrorMessage ||
            `MCP schema ${fileCount === 1 ? 'file' : 'files'} upload failed. Please check your ${fileCount === 1 ? 'file' : 'files'} and try again.`;
        notifications.push({
            type: 'error',
            content: errorContent,
            header: 'Schema Upload Failed',
            statusIconAriaLabel: 'error',
            dismissLabel: 'Dismiss message',
            dismissible: true,
            onDismiss: () => setDismissed(true),
            id: notificationId
        });
    }

    return notifications;
}

export interface NotificationsProps {
    status: string;
    onSuccessButtonAction: any;
    schemaUploadErrorMessage?: string;
    fileCount?: number;
}

export function Notifications({
    status,
    onSuccessButtonAction,
    schemaUploadErrorMessage,
    fileCount = 0
}: NotificationsProps) {
    const notifications = useNotifications(onSuccessButtonAction, status, schemaUploadErrorMessage, fileCount);
    return <Flashbar items={notifications} />;
}
