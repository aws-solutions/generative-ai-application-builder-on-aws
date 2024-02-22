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

import { renderWithProvider } from '@/utils';
import { VpcConfigReview } from '../VpcConfigReview';
import { screen } from '@testing-library/react';

describe('VpcConfig', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    test('should render', () => {
        const mockVpcData = {
            isVpcRequired: true,
            existingVpc: true,
            vpcId: 'vpc-234q23',
            subnetIds: ['subnet-asdf', 'subnet-asdf34r'],
            securityGroupIds: ['sg-24234']
        };
        const { cloudscapeWrapper } = renderWithProvider(
            <VpcConfigReview header="Test Review Section" setActiveStepIndex={jest.fn()} vpcData={mockVpcData} />,
            { route: '/vpc-config-review' }
        );
        expect(screen.getByTestId('vpc-config-details-container')).toBeDefined();
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Review Section');
    });
});
