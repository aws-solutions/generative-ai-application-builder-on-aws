// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryDetails } from '../../../useCaseDetails/memory/MemoryDetails';

vi.mock('@cloudscape-design/components', () => ({
    Box: ({ children, variant, 'data-testid': dataTestId }: any) => (
        <div data-testid={dataTestId} data-variant={variant}>
            {children}
        </div>
    ),
    ColumnLayout: ({ children }: any) => <div>{children}</div>
}));

describe('MemoryDetails Component', () => {
    test('renders memory configuration with LongTermEnabled true', () => {
        const mockSelectedDeployment = {
            AgentBuilderParams: {
                MemoryConfig: {
                    LongTermEnabled: true
                }
            }
        };

        render(<MemoryDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('Long Term Memory Enabled')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    test('renders memory configuration with LongTermEnabled false', () => {
        const mockSelectedDeployment = {
            AgentBuilderParams: {
                MemoryConfig: {
                    LongTermEnabled: false
                }
            }
        };

        render(<MemoryDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('Long Term Memory Enabled')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
    });

    test('renders N/A when LongTermEnabled is undefined', () => {
        const mockSelectedDeployment = {
            AgentBuilderParams: {
                MemoryConfig: {}
            }
        };

        render(<MemoryDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    test('renders empty state when MemoryConfig is missing', () => {
        const mockSelectedDeployment = {
            AgentBuilderParams: {}
        };

        render(<MemoryDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('No memory configuration')).toBeInTheDocument();
        expect(screen.getByText('This agent has no memory configuration set.')).toBeInTheDocument();
    });

    test('renders empty state when AgentBuilderParams is missing', () => {
        const mockSelectedDeployment = {};

        render(<MemoryDetails selectedDeployment={mockSelectedDeployment} />);

        expect(screen.getByText('No memory configuration')).toBeInTheDocument();
    });
});
