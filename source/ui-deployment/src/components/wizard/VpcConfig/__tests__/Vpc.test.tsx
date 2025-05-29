// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Vpc from '../Vpc';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('Vpc', () => {
    test('renders with VPC required and existing VPC false', () => {
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

    test('renders with VPC required and existing VPC true', () => {
        const mockVpcData = {
            info: {
                vpc: {
                    isVpcRequired: true,
                    existingVpc: true,
                    vpcId: 'vpc-12345678',
                    subnetIds: [
                        { key: 'subnet-12345678' },
                        { key: 'subnet-87654321' }
                    ],
                    securityGroupIds: [
                        { key: 'sg-12345678' },
                        { key: 'sg-87654321' }
                    ]
                }
            }
        };

        const callbacks = mockFormComponentCallbacks();
        renderWithProvider(<Vpc {...mockVpcData} {...callbacks} />, { route: '/vpc' });

        expect(screen.getByTestId('deploy-in-vpc-field')).toBeDefined();
        expect(screen.getByTestId('use-existing-vpc-field')).toBeDefined();
        expect(screen.getByTestId('vpc-id-field')).toBeDefined();
        expect(screen.getByTestId('subnet-ids-field')).toBeDefined();
        expect(screen.getByTestId('security-groups-field')).toBeDefined();
    });

    test('calls onChange with inError=true when subnet IDs have duplicates', () => {
        const mockVpcData = {
            info: {
                vpc: {
                    isVpcRequired: true,
                    existingVpc: true,
                    vpcId: 'vpc-12345678',
                    subnetIds: [
                        { key: 'subnet-12345678' },
                        { key: 'subnet-12345678' } // Duplicate
                    ],
                    securityGroupIds: [
                        { key: 'sg-12345678' },
                        { key: 'sg-87654321' }
                    ]
                }
            }
        };

        const callbacks = mockFormComponentCallbacks();
        renderWithProvider(<Vpc {...mockVpcData} {...callbacks} />, { route: '/vpc' });

        // The component should call onChange with inError=true due to duplicate subnet IDs
        expect(callbacks.onChange).toHaveBeenCalledWith({ inError: true });
    });

    test('calls onChange with inError=true when security group IDs have duplicates', () => {
        const mockVpcData = {
            info: {
                vpc: {
                    isVpcRequired: true,
                    existingVpc: true,
                    vpcId: 'vpc-12345678',
                    subnetIds: [
                        { key: 'subnet-12345678' },
                        { key: 'subnet-87654321' }
                    ],
                    securityGroupIds: [
                        { key: 'sg-12345678' },
                        { key: 'sg-12345678' } // Duplicate
                    ]
                }
            }
        };

        const callbacks = mockFormComponentCallbacks();
        renderWithProvider(<Vpc {...mockVpcData} {...callbacks} />, { route: '/vpc' });

        // The component should call onChange with inError=true due to duplicate security group IDs
        expect(callbacks.onChange).toHaveBeenCalledWith({ inError: true });
    });

    test('calls onChange with inError=false when no duplicates and valid IDs', () => {
        const mockVpcData = {
            info: {
                vpc: {
                    isVpcRequired: true,
                    existingVpc: true,
                    vpcId: 'vpc-12345678',
                    subnetIds: [
                        { key: 'subnet-12345678' },
                        { key: 'subnet-87654321' }
                    ],
                    securityGroupIds: [
                        { key: 'sg-12345678' },
                        { key: 'sg-87654321' }
                    ]
                }
            }
        };

        const callbacks = mockFormComponentCallbacks();
        renderWithProvider(<Vpc {...mockVpcData} {...callbacks} />, { route: '/vpc' });

        // The component should call onChange with inError=false since all IDs are valid and unique
        expect(callbacks.onChange).toHaveBeenCalledWith({ inError: false });
    });
});
