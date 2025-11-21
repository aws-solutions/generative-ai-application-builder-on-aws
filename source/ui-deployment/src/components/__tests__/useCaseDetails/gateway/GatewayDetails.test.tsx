// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { GatewayDetails } from '../../../useCaseDetails/gateway/GatewayDetails';

// Mock Cloudscape components
vi.mock('@cloudscape-design/components', () => ({
    ColumnLayout: ({ children }: any) => <div>{children}</div>,
    SpaceBetween: ({ children }: any) => <div>{children}</div>,
    Box: ({ children, variant }: any) => <div data-variant={variant}>{children}</div>
}));

describe('GatewayDetails Component', () => {
    test('renders gateway details with valid data', () => {
        const mockSelectedDeployment = {
            MCPParams: {
                GatewayParams: {
                    GatewayId: 'gateway-abc-123',
                    GatewayUrl: 'https://gateway.example.com/api/v1'
                }
            }
        };

        render(<GatewayDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('gateway-abc-123')).toBeInTheDocument();
        expect(screen.getByText('https://gateway.example.com/api/v1')).toBeInTheDocument();
    });

    test('renders N/A when gateway params are missing', () => {
        const mockSelectedDeployment = {
            MCPParams: {}
        };

        render(<GatewayDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getAllByText('N/A')).toHaveLength(2);
    });

    test('renders N/A when MCPParams is missing', () => {
        const mockSelectedDeployment = {};

        render(<GatewayDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getAllByText('N/A')).toHaveLength(2);
    });

    test('renders N/A when selectedDeployment is null', () => {
        render(<GatewayDetails selectedDeployment={null} />);

        expect(screen.getAllByText('N/A')).toHaveLength(2);
    });

    test('renders N/A when selectedDeployment is undefined', () => {
        render(<GatewayDetails selectedDeployment={undefined} />);

        expect(screen.getAllByText('N/A')).toHaveLength(2);
    });

    test('renders correct labels', () => {
        const mockSelectedDeployment = {
            MCPParams: {
                GatewayParams: {
                    GatewayId: 'test-id',
                    GatewayUrl: 'test-url'
                }
            }
        };

        render(<GatewayDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('Gateway ID')).toBeInTheDocument();
        expect(screen.getByText('Gateway URL')).toBeInTheDocument();
    });

    test('fields have correct test ids', () => {
        const mockSelectedDeployment = {
            MCPParams: {
                GatewayParams: {
                    GatewayId: 'test-id',
                    GatewayUrl: 'test-url'
                }
            }
        };

        render(<GatewayDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByTestId('gateway-id')).toBeInTheDocument();
        expect(screen.getByTestId('gateway-url')).toBeInTheDocument();
    });
});
