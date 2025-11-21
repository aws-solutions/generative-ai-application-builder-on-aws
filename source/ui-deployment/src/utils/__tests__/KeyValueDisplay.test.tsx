// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
    KeyValueDisplay,
    createKeyValueItem,
    createKeyValueGroup,
    formatListAsKeyValueItems,
    KeyValueItem,
    KeyValueGroup
} from '../KeyValueDisplay';

// Mock Cloudscape KeyValuePairs component
vi.mock('@cloudscape-design/components', () => ({
    KeyValuePairs: ({ items, columns, 'data-testid': dataTestId }: any) => (
        <div data-testid={dataTestId || 'key-value-pairs'} data-columns={columns}>
            {items.map((item: any, index: number) => (
                <div key={index} data-testid={`item-${index}`}>
                    {item.type === 'group' ? (
                        <div data-testid={`group-${index}`}>
                            <div data-testid={`group-title-${index}`}>{item.title}</div>
                            {item.items.map((groupItem: any, groupIndex: number) => (
                                <div key={groupIndex} data-testid={`group-item-${index}-${groupIndex}`}>
                                    <span data-testid={`label-${index}-${groupIndex}`}>{groupItem.label}</span>
                                    <span data-testid={`value-${index}-${groupIndex}`}>{groupItem.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <span data-testid={`label-${index}`}>{item.label}</span>
                            <span data-testid={`value-${index}`}>{item.value}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}));

describe('KeyValueDisplay', () => {
    describe('KeyValueDisplay Component', () => {
        test('renders with basic key-value items', () => {
            const items = [createKeyValueItem('Label 1', 'Value 1'), createKeyValueItem('Label 2', 'Value 2')];

            render(<KeyValueDisplay items={items} />);

            expect(screen.getByTestId('key-value-pairs')).toBeInTheDocument();
            expect(screen.getByTestId('label-0')).toHaveTextContent('Label 1');
            expect(screen.getByTestId('value-0')).toHaveTextContent('Value 1');
            expect(screen.getByTestId('label-1')).toHaveTextContent('Label 2');
            expect(screen.getByTestId('value-1')).toHaveTextContent('Value 2');
        });

        test('renders with custom columns', () => {
            const items = [createKeyValueItem('Label', 'Value')];

            render(<KeyValueDisplay items={items} columns={3} />);

            const keyValuePairs = screen.getByTestId('key-value-pairs');
            expect(keyValuePairs).toHaveAttribute('data-columns', '3');
        });

        test('renders with default columns when not specified', () => {
            const items = [createKeyValueItem('Label', 'Value')];

            render(<KeyValueDisplay items={items} />);

            const keyValuePairs = screen.getByTestId('key-value-pairs');
            expect(keyValuePairs).toHaveAttribute('data-columns', '2');
        });

        test('renders with custom data-testid', () => {
            const items = [createKeyValueItem('Label', 'Value')];

            render(<KeyValueDisplay items={items} data-testid="custom-test-id" />);

            expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
        });

        test('renders with React node values', () => {
            const items = [
                createKeyValueItem('Label', <span>React Node Value</span>),
                createKeyValueItem(
                    'Another Label',
                    <div>
                        <strong>Bold Text</strong>
                    </div>
                )
            ];

            render(<KeyValueDisplay items={items} />);

            expect(screen.getByText('React Node Value')).toBeInTheDocument();
            expect(screen.getByText('Bold Text')).toBeInTheDocument();
        });

        test('renders with groups', () => {
            const groupItems = [
                createKeyValueItem('Group Item 1', 'Group Value 1'),
                createKeyValueItem('Group Item 2', 'Group Value 2')
            ];
            const items = [
                createKeyValueGroup('Test Group', groupItems),
                createKeyValueItem('Regular Item', 'Regular Value')
            ];

            render(<KeyValueDisplay items={items} />);

            expect(screen.getByTestId('group-title-0')).toHaveTextContent('Test Group');
            expect(screen.getByTestId('label-0-0')).toHaveTextContent('Group Item 1');
            expect(screen.getByTestId('value-0-0')).toHaveTextContent('Group Value 1');
            expect(screen.getByTestId('label-0-1')).toHaveTextContent('Group Item 2');
            expect(screen.getByTestId('value-0-1')).toHaveTextContent('Group Value 2');
            expect(screen.getByTestId('label-1')).toHaveTextContent('Regular Item');
            expect(screen.getByTestId('value-1')).toHaveTextContent('Regular Value');
        });

        test('renders with empty items array', () => {
            render(<KeyValueDisplay items={[]} />);

            expect(screen.getByTestId('key-value-pairs')).toBeInTheDocument();
        });

        test('renders with mixed items and groups', () => {
            const groupItems = [createKeyValueItem('Grouped Item', 'Grouped Value')];
            const items = [
                createKeyValueItem('Simple Item', 'Simple Value'),
                createKeyValueGroup('Mixed Group', groupItems),
                createKeyValueItem('Another Item', 'Another Value')
            ];

            render(<KeyValueDisplay items={items} />);

            expect(screen.getByTestId('label-0')).toHaveTextContent('Simple Item');
            expect(screen.getByTestId('group-title-1')).toHaveTextContent('Mixed Group');
            expect(screen.getByTestId('label-2')).toHaveTextContent('Another Item');
        });
    });

    describe('createKeyValueItem', () => {
        test('creates basic key-value item', () => {
            const item = createKeyValueItem('Test Label', 'Test Value');

            expect(item).toEqual({
                label: 'Test Label',
                value: 'Test Value'
            });
        });

        test('creates key-value item with data-testid', () => {
            const item = createKeyValueItem('Test Label', 'Test Value', 'test-id');

            expect(item).toEqual({
                label: 'Test Label',
                value: 'Test Value',
                'data-testid': 'test-id'
            });
        });

        test('creates key-value item with React node value', () => {
            const reactValue = <span>React Value</span>;
            const item = createKeyValueItem('Test Label', reactValue);

            expect(item).toEqual({
                label: 'Test Label',
                value: reactValue
            });
        });

        test('creates key-value item without data-testid when not provided', () => {
            const item = createKeyValueItem('Test Label', 'Test Value');

            expect(item).not.toHaveProperty('data-testid');
        });
    });

    describe('createKeyValueGroup', () => {
        test('creates basic key-value group', () => {
            const items = [createKeyValueItem('Item 1', 'Value 1'), createKeyValueItem('Item 2', 'Value 2')];
            const group = createKeyValueGroup('Test Group', items);

            expect(group).toEqual({
                type: 'group',
                title: 'Test Group',
                items: items
            });
        });

        test('creates key-value group with data-testid', () => {
            const items = [createKeyValueItem('Item', 'Value')];
            const group = createKeyValueGroup('Test Group', items, 'group-test-id');

            expect(group).toEqual({
                type: 'group',
                title: 'Test Group',
                items: items,
                'data-testid': 'group-test-id'
            });
        });

        test('creates key-value group with empty items array', () => {
            const group = createKeyValueGroup('Empty Group', []);

            expect(group).toEqual({
                type: 'group',
                title: 'Empty Group',
                items: []
            });
        });

        test('creates key-value group without data-testid when not provided', () => {
            const items = [createKeyValueItem('Item', 'Value')];
            const group = createKeyValueGroup('Test Group', items);

            expect(group).not.toHaveProperty('data-testid');
        });
    });

    describe('formatListAsKeyValueItems', () => {
        test('formats list of objects with name and description', () => {
            const list = [
                { name: 'Item 1', description: 'Description 1' },
                { name: 'Item 2', description: 'Description 2' }
            ];

            const result = formatListAsKeyValueItems(list);
            render(<div>{result}</div>);

            expect(screen.getByText('Item 1')).toBeInTheDocument();
            expect(screen.getByText('Description 1')).toBeInTheDocument();
            expect(screen.getByText('Item 2')).toBeInTheDocument();
            expect(screen.getByText('Description 2')).toBeInTheDocument();
        });

        test('returns empty message for empty list', () => {
            const result = formatListAsKeyValueItems([]);

            expect(result).toBe('None selected');
        });

        test('returns empty message for null list', () => {
            const result = formatListAsKeyValueItems(null as any);

            expect(result).toBe('None selected');
        });

        test('returns empty message for undefined list', () => {
            const result = formatListAsKeyValueItems(undefined as any);

            expect(result).toBe('None selected');
        });

        test('returns custom empty message', () => {
            const result = formatListAsKeyValueItems([], 'No items available');

            expect(result).toBe('No items available');
        });

        test('formats single item list', () => {
            const list = [{ name: 'Single Item', description: 'Single Description' }];

            const result = formatListAsKeyValueItems(list);
            render(<div>{result}</div>);

            expect(screen.getByText('Single Item')).toBeInTheDocument();
            expect(screen.getByText('Single Description')).toBeInTheDocument();
        });

        test('handles items with empty descriptions', () => {
            const list = [
                { name: 'Item with description', description: 'Has description' },
                { name: 'Item without description', description: '' }
            ];

            const result = formatListAsKeyValueItems(list);
            render(<div>{result}</div>);

            expect(screen.getByText('Item with description')).toBeInTheDocument();
            expect(screen.getByText('Has description')).toBeInTheDocument();
            expect(screen.getByText('Item without description')).toBeInTheDocument();
        });

        test('applies correct styling to formatted items', () => {
            const list = [{ name: 'Test Item', description: 'Test Description' }];

            const result = formatListAsKeyValueItems(list);
            render(<div data-testid="formatted-list">{result}</div>);

            const container = screen.getByTestId('formatted-list');
            const itemContainer = container.querySelector('div[style*="margin-bottom: 8px"]');
            const descriptionElement = container.querySelector('div[style*="font-size: 12px"]');

            expect(itemContainer).toBeInTheDocument();
            expect(descriptionElement).toBeInTheDocument();
            expect(descriptionElement).toHaveTextContent('Test Description');
        });
    });

    describe('Type Definitions', () => {
        test('KeyValueItem type accepts string values', () => {
            const item: KeyValueItem = {
                label: 'String Label',
                value: 'String Value'
            };

            expect(item.label).toBe('String Label');
            expect(item.value).toBe('String Value');
        });

        test('KeyValueItem type accepts React node values', () => {
            const item: KeyValueItem = {
                label: 'React Label',
                value: <div>React Node</div>
            };

            expect(item.label).toBe('React Label');
            expect(React.isValidElement(item.value)).toBe(true);
        });

        test('KeyValueGroup type structure', () => {
            const items = [createKeyValueItem('Item', 'Value')];
            const group: KeyValueGroup = {
                type: 'group',
                title: 'Group Title',
                items: items
            };

            expect(group.type).toBe('group');
            expect(group.title).toBe('Group Title');
            expect(group.items).toEqual(items);
        });
    });

    describe('Integration Tests', () => {
        test('renders complex nested structure', () => {
            const serverItems = [
                createKeyValueItem('Server 1', 'Healthcare System'),
                createKeyValueItem('Server 2', 'Database Connector')
            ];
            const toolItems = [
                createKeyValueItem('Tool 1', 'HTTP Request'),
                createKeyValueItem('Tool 2', 'File Operations')
            ];

            const items = [
                createKeyValueItem('Memory', 'Enabled'),
                createKeyValueGroup('MCP Servers', serverItems),
                createKeyValueGroup('Tools', toolItems),
                createKeyValueItem('System Prompt', <code>You are a helpful assistant</code>)
            ];

            render(<KeyValueDisplay items={items} columns={1} data-testid="complex-display" />);

            // Verify main structure
            expect(screen.getByTestId('complex-display')).toBeInTheDocument();
            expect(screen.getByTestId('complex-display')).toHaveAttribute('data-columns', '1');

            // Verify simple items
            expect(screen.getByTestId('label-0')).toHaveTextContent('Memory');
            expect(screen.getByTestId('value-0')).toHaveTextContent('Enabled');

            // Verify groups
            expect(screen.getByTestId('group-title-1')).toHaveTextContent('MCP Servers');
            expect(screen.getByTestId('group-title-2')).toHaveTextContent('Tools');

            // Verify group items
            expect(screen.getByTestId('label-1-0')).toHaveTextContent('Server 1');
            expect(screen.getByTestId('value-1-0')).toHaveTextContent('Healthcare System');
            expect(screen.getByTestId('label-2-0')).toHaveTextContent('Tool 1');
            expect(screen.getByTestId('value-2-0')).toHaveTextContent('HTTP Request');

            // Verify React node value
            expect(screen.getByText('You are a helpful assistant')).toBeInTheDocument();
        });
    });
});
