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

    test('Sec group attribute editor should render correctly', () => {
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

    test('should set error to true in invalid security group id entered', () => {
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
});
