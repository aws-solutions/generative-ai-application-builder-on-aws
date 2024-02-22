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
