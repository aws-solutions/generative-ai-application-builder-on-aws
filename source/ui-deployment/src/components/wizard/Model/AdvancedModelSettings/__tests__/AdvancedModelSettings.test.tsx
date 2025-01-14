// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AdvancedModelSettings } from '../AdvancedModelSettings';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';

describe('AdvancedModelSettings', () => {
    const mockModelData = {
        modelParameters: [
            {
                'key': 'mock-str',
                'value': 'mock-str',
                'type': {
                    'label': 'string',
                    'value': 'string'
                }
            },
            {
                'key': 'mock-integer',
                'value': '1',
                'type': {
                    'label': 'integer',
                    'value': 'integer'
                }
            }
        ]
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <AdvancedModelSettings {...mockFormComponentCallbacks()} model={mockModelData} />
        );
        expect(screen.getByTestId('advanced-settings-container')).toBeDefined();

        const editor = cloudscapeWrapper
            ?.findContainer('[data-testid="advanced-settings-container"]')
            ?.findContent()
            .findAttributeEditor();

        const rows = editor?.findRows();
        expect(rows?.length).toBe(2);

        const firstRow = editor?.findRow(1);
        const rowDef = firstRow?.findFields();

        expect(firstRow?.getElement().textContent).toContain('Key');
        expect(firstRow?.getElement().textContent).toContain('Value');
        expect(firstRow?.getElement().textContent).toContain('Type');
        expect(rowDef?.length).toBe(3);
    });

    test('should add another value', () => {
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<AdvancedModelSettings {...callbacks} model={mockModelData} />);

        const editor = cloudscapeWrapper
            ?.findContainer('[data-testid="advanced-settings-container"]')
            ?.findContent()
            .findAttributeEditor();

        const addButton = editor?.findAddButton();
        addButton?.click();

        const rows = editor?.findRows();
        expect(rows?.length).toBe(3);

        const firstRow = editor?.findRow(1);
        const rowDef = firstRow?.findFields();

        expect(firstRow?.getElement().textContent).toContain('Key');
        expect(firstRow?.getElement().textContent).toContain('Value');
        expect(firstRow?.getElement().textContent).toContain('Type');
        expect(rowDef?.length).toBe(3);

        expect(editor?.findRow(2)?.findFields()?.length).toBe(3);
        expect(editor?.findRow(3)?.findFields()?.length).toBe(3);

        expect(callbacks.onChange).toHaveBeenCalled();
        expect(callbacks.onChange).toHaveBeenCalledWith({ modelParameters: [...mockModelData.modelParameters, {}] });
    });
});
