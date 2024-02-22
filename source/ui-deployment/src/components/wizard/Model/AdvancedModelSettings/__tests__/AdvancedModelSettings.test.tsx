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
