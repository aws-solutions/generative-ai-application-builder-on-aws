// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { NotificationOptions } from '../hooks/useNotifications';

export const createApiErrorNotification = (error: any, operation: string = 'operation') => {
    const message = error?.message || error?.toString() || 'An unexpected error occurred';
    return {
        content: `Failed to ${operation}: ${message}`,
        header: 'API Error',
        options: {
            dismissible: true,
            autoDismiss: false,
            action: {
                text: 'Retry',
                onClick: () => window.location.reload()
            }
        } as NotificationOptions
    };
};

export const createValidationErrorNotification = (errors: string[]) => {
    const content =
        errors.length === 1 ? errors[0] : `Please fix the following errors:\n${errors.map((e) => `• ${e}`).join('\n')}`;

    return {
        content,
        header: 'Validation Error',
        options: {
            dismissible: true,
            autoDismiss: false
        } as NotificationOptions
    };
};

export const createSuccessWithActionNotification = (message: string, actionText: string, actionHandler: () => void) => {
    return {
        content: message,
        header: 'Success',
        options: {
            dismissible: true,
            autoDismiss: true,
            autoDismissTimeout: 8000,
            action: {
                text: actionText,
                onClick: actionHandler
            }
        } as NotificationOptions
    };
};

export const createProgressNotification = (message: string, progress?: number) => {
    const content = progress !== undefined ? `${message} (${Math.round(progress)}%)` : message;

    return {
        content,
        header: 'Processing',
        options: {
            loading: true,
            dismissible: false,
            autoDismiss: false
        } as NotificationOptions
    };
};

export const createNetworkErrorNotification = () => {
    return {
        content: 'Please check your internet connection and try again.',
        header: 'Network Error',
        options: {
            dismissible: true,
            autoDismiss: false,
            action: {
                text: 'Retry',
                onClick: () => window.location.reload()
            }
        } as NotificationOptions
    };
};

export const createPermissionErrorNotification = (resource: string = 'resource') => {
    return {
        content: `You don't have permission to access this ${resource}. Please contact your administrator.`,
        header: 'Access Denied',
        options: {
            dismissible: true,
            autoDismiss: false
        } as NotificationOptions
    };
};

export const createTimeoutNotification = (operation: string = 'operation') => {
    return {
        content: `The ${operation} is taking longer than expected. Please wait or try again.`,
        header: 'Operation Timeout',
        options: {
            dismissible: true,
            autoDismiss: false,
            action: {
                text: 'Retry',
                onClick: () => window.location.reload()
            }
        } as NotificationOptions
    };
};

export const createBulkOperationNotification = (total: number, successful: number, operation: string) => {
    const failed = total - successful;

    if (failed === 0) {
        return {
            content: `Successfully ${operation} ${total} item${total === 1 ? '' : 's'}.`,
            header: 'Operation Complete',
            options: {
                dismissible: true,
                autoDismiss: true
            } as NotificationOptions
        };
    } else if (successful === 0) {
        return {
            content: `Failed to ${operation} ${total} item${total === 1 ? '' : 's'}.`,
            header: 'Operation Failed',
            options: {
                dismissible: true,
                autoDismiss: false
            } as NotificationOptions
        };
    } else {
        return {
            content: `${operation} completed: ${successful} successful, ${failed} failed.`,
            header: 'Operation Partially Complete',
            options: {
                dismissible: true,
                autoDismiss: false
            } as NotificationOptions
        };
    }
};
