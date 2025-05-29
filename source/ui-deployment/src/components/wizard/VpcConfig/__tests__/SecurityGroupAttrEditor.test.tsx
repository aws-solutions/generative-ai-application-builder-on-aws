// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import SecurityGroupAttrEditor from '../SecurityGroupAttrEditor';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';

describe('SecurityGroupAttrEditor', () => {
    const mockVpcData = {
        securityGroupIds: [
            {
                'key': 'sg-12312312'
            },
            {
                'key': 'sg-45645645'
            },
            {
                'key': 'sg-2342342s'
            },
            {
                'key': 'sg-asdfasdf'
            }
        ]
    };

    const mockVpcDataWithDuplicates = {
        securityGroupIds: [
            {
                'key': 'sg-12312312'
            },
            {
                'key': 'sg-12312312'
            },
            {
                'key': 'sg-2342342s'
            },
            {
                'key': 'sg-asdfasdf'
            }
        ]
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Security group attribute editor should render correctly', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <SecurityGroupAttrEditor vpcData={mockVpcData} {...callbacks} />
        );

        expect(screen.getByTestId('security-groups-field')).toBeDefined();
        const editor = cloudscapeWrapper?.findAttributeEditor();

        const rows = editor?.findRows();
        expect(rows?.length).toBe(4);

        const firstRow = editor?.findRow(1);
        const rowDef = firstRow?.findFields();

        expect(rowDef?.length).toBe(1);
    });

    test('Should add another item using onChange function', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <SecurityGroupAttrEditor vpcData={mockVpcData} {...callbacks} />
        );

        const editor = cloudscapeWrapper?.findAttributeEditor();
        const addButton = editor?.findAddButton();
        addButton?.click();

        editor?.findRow(5)?.findInput()?.setInputValue('sg-fake1123');
        expect(callbacks.onChangeFn).toHaveBeenCalled();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            securityGroupIds: [...mockVpcData.securityGroupIds, { key: 'sg-fake1123' }]
        });
    });

    test('should show error for invalid security group id format', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <SecurityGroupAttrEditor vpcData={mockVpcData} {...callbacks} />
        );

        const editor = cloudscapeWrapper?.findAttributeEditor();
        const addButton = editor?.findAddButton();
        addButton?.click();

        editor?.findRow(5)?.findInput()?.setInputValue('fake1123123123-');
        expect(editor?.findRow(5)?.findField(1)?.findError()?.getElement().innerHTML).toEqual(
            'Must start with "sg-" and be of valid length'
        );
    });

    test('should show error for duplicate security group id', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <SecurityGroupAttrEditor vpcData={mockVpcData} {...callbacks} />
        );

        const editor = cloudscapeWrapper?.findAttributeEditor();
        const addButton = editor?.findAddButton();
        addButton?.click();

        // Add a duplicate of an existing security group ID
        editor?.findRow(5)?.findInput()?.setInputValue('sg-12312312');
        
        // Check that the error message for duplicates is shown
        expect(editor?.findRow(5)?.findField(1)?.findError()?.getElement().innerHTML).toEqual(
            'Security Group ID must be unique'
        );
    });

    test('should show form-level error when initialized with duplicate security group ids', () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <SecurityGroupAttrEditor vpcData={mockVpcDataWithDuplicates} {...callbacks} />
        );

        // Check for form-level error message
        const formField = cloudscapeWrapper?.findFormField();
        expect(formField?.findError()).toBeDefined();
        expect(formField?.findError()?.getElement().innerHTML).toContain('Duplicate security group IDs are not allowed');
    });

    test('should not call onChange when duplicates exist', () => {
        const callbacks = mockFormComponentCallbacks();
        jest.clearAllMocks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <SecurityGroupAttrEditor vpcData={mockVpcData} {...callbacks} />
        );

        const editor = cloudscapeWrapper?.findAttributeEditor();
        const addButton = editor?.findAddButton();
        addButton?.click();

        // Reset the mock to clear previous calls
        callbacks.onChangeFn.mockClear();
        
        // Add a duplicate security group ID
        editor?.findRow(5)?.findInput()?.setInputValue('sg-12312312');
        
        // The onChange should not be called with the duplicates
        expect(callbacks.onChangeFn).not.toHaveBeenCalledWith({
            securityGroupIds: [...mockVpcData.securityGroupIds, { key: 'sg-12312312' }]
        });
    });
});
