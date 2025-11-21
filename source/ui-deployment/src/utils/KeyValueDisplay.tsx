// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { KeyValuePairs } from '@cloudscape-design/components';

export interface KeyValueItem {
    label: string;
    value: React.ReactNode;
    'data-testid'?: string;
}

export interface KeyValueGroup {
    type: 'group';
    title: string;
    items: KeyValueItem[];
    'data-testid'?: string;
}

export type KeyValueDisplayItem = KeyValueItem | KeyValueGroup;

interface KeyValueDisplayProps {
    items: KeyValueDisplayItem[];
    columns?: number;
    'data-testid'?: string;
}

/**
 * A utility component that wraps Cloudscape's KeyValuePairs component
 * for consistent display of key-value data in review pages.
 *
 * @param items - Array of key-value items or groups to display
 * @param columns - Number of columns to display (default: 2)
 * @param data-testid - Test ID for the component
 */
export const KeyValueDisplay = ({ items, columns = 2, 'data-testid': dataTestId }: KeyValueDisplayProps) => {
    return <KeyValuePairs columns={columns} items={items} data-testid={dataTestId} />;
};

/**
 * Helper function to create a simple key-value item
 */
export const createKeyValueItem = (label: string, value: React.ReactNode, dataTestId?: string): KeyValueItem => ({
    label,
    value,
    ...(dataTestId && { 'data-testid': dataTestId })
});

/**
 * Helper function to create a key-value group
 */
export const createKeyValueGroup = (title: string, items: KeyValueItem[], dataTestId?: string): KeyValueGroup => ({
    type: 'group',
    title,
    items,
    ...(dataTestId && { 'data-testid': dataTestId })
});

/**
 * Helper function to format a list of objects into key-value items
 * Useful for displaying arrays of MCP servers, tools, etc.
 */
export const formatListAsKeyValueItems = (
    list: Array<{ name: string; description: string }>,
    emptyMessage: string = 'None selected'
): React.ReactNode => {
    if (!list || list.length === 0) {
        return emptyMessage;
    }

    return (
        <div>
            {list.map((item, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                    <div>{item.name}</div>
                    <div style={{ fontSize: '12px' }}>{item.description}</div>
                </div>
            ))}
        </div>
    );
};

export default KeyValueDisplay;
