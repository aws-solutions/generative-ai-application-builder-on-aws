// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Vpc from '../Vpc';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('Vpc', () => {
    test('renders', () => {
        const mockVpcData = {
            info: {
                vpc: {
                    isVpcRequired: true,
                    existingVpc: false
                }
            }
        };

        const callbacks = mockFormComponentCallbacks();
        renderWithProvider(<Vpc {...mockVpcData} {...callbacks} />, { route: '/vpc' });

        expect(screen.getByTestId('deploy-in-vpc-field')).toBeDefined();
        expect(screen.getByTestId('use-existing-vpc-field')).toBeDefined();
    });
});
