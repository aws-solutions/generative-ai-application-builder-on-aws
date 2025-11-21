// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Gateway } from '../../../useCaseDetails/gateway/Gateway';

// Mock Cloudscape components
vi.mock('@cloudscape-design/components', () => ({
    Container: ({ header, children }: any) => (
        <div>
            {header}
            {children}
        </div>
    ),
    Header: ({ variant, info, children }: any) => (
        <div>
            <h2>{children}</h2>
            {info}
        </div>
    ),
    SpaceBetween: ({ children }: any) => <div>{children}</div>,
    ColumnLayout: ({ children }: any) => <div>{children}</div>,
    Box: ({ children, variant }: any) => <div data-variant={variant}>{children}</div>
}));

// Mock the InfoLink component
vi.mock('@/components/commons', () => ({
    InfoLink: ({ onFollow, ariaLabel }: { onFollow: (event: any) => void; ariaLabel?: string }) => (
        <button onClick={() => onFollow({ detail: { href: '#' } })} aria-label={ariaLabel}>
            Info
        </button>
    )
}));

const mockLoadHelpPanelContent = vi.fn();

const mockSelectedDeploymentWithGateway = {
    MCPParams: {
        GatewayParams: {
            GatewayId: 'test-gateway-id-123',
            GatewayUrl: 'https://api.example.com/gateway'
        }
    }
};

const mockSelectedDeploymentWithoutGateway = {
    MCPParams: {}
};

describe('Gateway Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders gateway configuration with valid data', () => {
        render(
            <Gateway
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeploymentWithGateway}
            />
        );

        expect(screen.getByText('Gateway Configuration')).toBeInTheDocument();
        expect(screen.getByText('test-gateway-id-123')).toBeInTheDocument();
        expect(screen.getByText('https://api.example.com/gateway')).toBeInTheDocument();
    });

    test('renders N/A when gateway data is missing', () => {
        render(
            <Gateway
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeploymentWithoutGateway}
            />
        );

        expect(screen.getByText('Gateway Configuration')).toBeInTheDocument();
        expect(screen.getAllByText('N/A')).toHaveLength(2);
    });

    test('renders N/A when selectedDeployment is null', () => {
        render(<Gateway loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={null} />);

        expect(screen.getByText('Gateway Configuration')).toBeInTheDocument();
        expect(screen.getAllByText('N/A')).toHaveLength(2);
    });

    test('calls loadHelpPanelContent when info button is clicked', () => {
        render(
            <Gateway
                loadHelpPanelContent={mockLoadHelpPanelContent}
                selectedDeployment={mockSelectedDeploymentWithGateway}
            />
        );

        const infoButton = screen.getByText('Info');
        infoButton.click();

        expect(mockLoadHelpPanelContent).toHaveBeenCalledWith(1);
    });

});
