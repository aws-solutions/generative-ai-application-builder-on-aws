// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import VpcId from '../VpcId';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { Box } from '@cloudscape-design/components';
import { screen } from '@testing-library/react';

describe('VpcId', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockVpcData = {
            vpcId: 'vpc-0123456789abcdef'
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<VpcId disabled={false} vpcData={mockVpcData} {...callbacks} />);

        expect(screen.getByTestId('vpc-id-field')).toBeDefined();
        expect(cloudscapeWrapper.findInput()?.getInputValue()).toEqual('vpc-0123456789abcdef');

        cloudscapeWrapper.findInput()?.setInputValue('vpc-abcdef0123456789');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({ vpcId: 'vpc-abcdef0123456789' });
    });

    test('renders with error', () => {
        const mockVpcData = {
            vpcId: 'vpc-0123'
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <Box>
                <VpcId disabled={false} vpcData={mockVpcData} {...callbacks} />
            </Box>
        );

        expect(screen.getByTestId('vpc-id-field')).toBeDefined();

        cloudscapeWrapper.findInput()?.setInputValue('vc-01234');
        expect(callbacks.onChangeFn).toHaveBeenCalled();
        expect(callbacks.setNumFieldsInError).toHaveBeenCalled();
    });
});
