// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { TableProps } from '@cloudscape-design/components';

export const baseTableAriaLabels: TableProps.AriaLabels<unknown> = {
    allItemsSelectionLabel: () => 'select all'
};

const baseEditableLabels: TableProps.AriaLabels<{ id: string }> = {
    activateEditLabel: (column, item) => `Edit ${item.id} ${column.header}`,
    cancelEditLabel: (column) => `Cancel editing ${column.header}`,
    submitEditLabel: (column) => `Submit edit ${column.header}`,
    submittingEditText: () => 'Submitting edit',
    successfulEditLabel: () => 'Edit successful'
};

export const deploymentTableAriaLabels: TableProps.AriaLabels<{ id: string }> = {
    ...baseTableAriaLabels,
    itemSelectionLabel: (data, row) => `select ${row.id}`,
    selectionGroupLabel: 'Deployment selection'
};

export const deploymentEditableTableAriaLabels: TableProps.AriaLabels<{ id: string }> = {
    ...deploymentTableAriaLabels,
    ...baseEditableLabels
};
