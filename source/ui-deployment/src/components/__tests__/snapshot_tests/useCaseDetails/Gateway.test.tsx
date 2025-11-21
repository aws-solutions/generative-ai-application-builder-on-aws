// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import renderer from 'react-test-renderer';
import { Gateway } from '../../../useCaseDetails/gateway/Gateway';

vi.mock('@cloudscape-design/components');

// Mock the InfoLink component
vi.mock('@/components/commons', () => ({
    InfoLink: ({ onFollow, ariaLabel }: { onFollow: (event: any) => void; ariaLabel?: string }) => (
        <button onClick={() => onFollow({ detail: { href: '#' } })} aria-label={ariaLabel}>
            Info
        </button>
    )
}));

const mockLoadHelpPanelContent = vi.fn();

describe('Gateway Component Snapshots', () => {
    test('Gateway component with valid data', () => {
        const mockSelectedDeployment = {
            MCPParams: {
                GatewayParams: {
                    GatewayId: 'test-gateway-id-123',
                    GatewayUrl: 'https://api.example.com/gateway'
                }
            }
        };

        const tree = renderer
            .create(
                <Gateway loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={mockSelectedDeployment} />
            )
            .toJSON();

        expect(tree).toMatchSnapshot();
    });

    test('Gateway component with missing data', () => {
        const mockSelectedDeployment = {
            MCPParams: {}
        };

        const tree = renderer
            .create(
                <Gateway loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={mockSelectedDeployment} />
            )
            .toJSON();

        expect(tree).toMatchSnapshot();
    });

    test('Gateway component with null deployment', () => {
        const tree = renderer
            .create(<Gateway loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={null} />)
            .toJSON();

        expect(tree).toMatchSnapshot();
    });
});
