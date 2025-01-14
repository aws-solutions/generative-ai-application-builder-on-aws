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

    test('Sec group attribute editor should render correctly', () => {
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

    test('should set error to true in invalid security group id entered', () => {
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
});
