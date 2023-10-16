/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

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

export function createTableSortLabelFn(
    column: TableProps.ColumnDefinition<unknown>
): TableProps.ColumnDefinition<unknown>['ariaLabel'] {
    if (!column.sortingField && !column.sortingComparator && !column.ariaLabel) {
        return;
    }
    return ({ sorted, descending }) => {
        if (!sorted) {
            return `${column.header}, 'not sorted'`;
        }

        const sortingOrder = descending ? 'descending' : 'ascending';
        return `${column.header}, sorted ${sortingOrder}`;
    };
}
