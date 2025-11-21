// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export { useNotifications } from '../../hooks/useNotifications';
export type { NotificationItem, NotificationOptions } from '../../hooks/useNotifications';

export { Notifications } from './Notifications';
export type { NotificationsProps } from './Notifications';

export {
    createApiErrorNotification,
    createValidationErrorNotification,
    createSuccessWithActionNotification,
    createProgressNotification,
    createNetworkErrorNotification,
    createPermissionErrorNotification,
    createTimeoutNotification,
    createBulkOperationNotification
} from '../../utils/notificationHelpers';

import { useNotifications } from '../../hooks/useNotifications';
import { Notifications } from './Notifications';

export default {
    useNotifications,
    Notifications
};
