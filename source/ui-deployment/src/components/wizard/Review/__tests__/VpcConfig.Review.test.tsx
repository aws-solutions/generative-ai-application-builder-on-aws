// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
