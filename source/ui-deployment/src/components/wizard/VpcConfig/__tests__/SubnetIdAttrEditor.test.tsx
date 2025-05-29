// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import SubnetIdAttrEditor from '../SubnetIdAttrEditor';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('Subnet Id Attribute Editor', () => {
    const mockVpcData = {
        subnetIds: [
            {
                'key': 'subnet-12312312'
            },
            {
                'key': 'subnet-45645645'
            },
            {
                'key': 'subnet-2342342s'
            },
            {
                'key': 'subnet-asdfasdf'
            }
        ]
    };

    const mockVpcDataWithDuplicates = {
        subnetIds: [
            {
                'key': 'subnet-12312312'
            },
            {
                'key': 'subnet-12312312'
            },
            {
                'key': 'subnet-2342342s'
            },
            {
                'key': 'subnet-asdfasdf'
            }
        ]
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Subnet id attribute editor should render correctly', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<SubnetIdAttrEditor vpcData={mockVpcData} {...callbacks} />);

        expect(screen.getByTestId('subnet-ids-field')).toBeDefined();
        const editor = cloudscapeWrapper?.findAttributeEditor();

        const rows = editor?.findRows();
        expect(rows?.length).toBe(4);

        const firstRow = editor?.findRow(1);
        const rowDef = firstRow?.findFields();

        expect(rowDef?.length).toBe(1);
    });

    test('Should add another item using onChange function', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<SubnetIdAttrEditor vpcData={mockVpcData} {...callbacks} />);

        const editor = cloudscapeWrapper?.findAttributeEditor();
        const addButton = editor?.findAddButton();
        addButton?.click();

        editor?.findRow(5)?.findInput()?.setInputValue('subnet-fake1123');
        expect(callbacks.onChangeFn).toHaveBeenCalled();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            subnetIds: [...mockVpcData.subnetIds, { key: 'subnet-fake1123' }]
        });
    });

    test('should show error for invalid subnet id format', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<SubnetIdAttrEditor vpcData={mockVpcData} {...callbacks} />);

        const editor = cloudscapeWrapper?.findAttributeEditor();
        const addButton = editor?.findAddButton();
        addButton?.click();

        editor?.findRow(5)?.findInput()?.setInputValue('fake1123123123-');
        expect(callbacks.onChangeFn).toHaveBeenCalled();

        expect(editor?.findRow(5)?.findField(1)?.findError()?.getElement().innerHTML).toEqual(
            'Must start with "subnet-" and be of valid length'
        );
    });

    test('should show error for duplicate subnet id', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<SubnetIdAttrEditor vpcData={mockVpcData} {...callbacks} />);

        const editor = cloudscapeWrapper?.findAttributeEditor();
        const addButton = editor?.findAddButton();
        addButton?.click();

        // Add a duplicate of an existing subnet ID
        editor?.findRow(5)?.findInput()?.setInputValue('subnet-12312312');
        
        // Check that the error message for duplicates is shown
        expect(editor?.findRow(5)?.findField(1)?.findError()?.getElement().innerHTML).toEqual(
            'Subnet ID must be unique'
        );
    });

    test('should show form-level error when initialized with duplicate subnet ids', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <SubnetIdAttrEditor vpcData={mockVpcDataWithDuplicates} {...callbacks} />
        );

        // Check for form-level error message
        const formField = cloudscapeWrapper?.findFormField();
        expect(formField?.findError()).toBeDefined();
        expect(formField?.findError()?.getElement().innerHTML).toContain('Duplicate subnet IDs are not allowed');
    });

    test('should not call onChange when duplicates exist', () => {
        const callbacks = mockFormComponentCallbacks();
        jest.clearAllMocks();

        const { cloudscapeWrapper } = cloudscapeRender(<SubnetIdAttrEditor vpcData={mockVpcData} {...callbacks} />);

        const editor = cloudscapeWrapper?.findAttributeEditor();
        const addButton = editor?.findAddButton();
        addButton?.click();

        // Reset the mock to clear previous calls
        callbacks.onChangeFn.mockClear();
        
        // Add a duplicate subnet ID
        editor?.findRow(5)?.findInput()?.setInputValue('subnet-12312312');
        
        // The onChange should not be called with the duplicates
        expect(callbacks.onChangeFn).not.toHaveBeenCalledWith({
            subnetIds: [...mockVpcData.subnetIds, { key: 'subnet-12312312' }]
        });
    });
});
