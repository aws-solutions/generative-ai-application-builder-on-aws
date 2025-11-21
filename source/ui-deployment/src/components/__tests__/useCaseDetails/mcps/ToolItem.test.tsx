// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { ToolItem } from '@/components/useCaseDetails/mcps/ToolItem';
import { cloudscapeRender } from '@/utils';

describe('ToolItem Component', () => {
    const mockTool = {
        ToolId: 'test-tool-123'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders tool ID', () => {
        cloudscapeRender(<ToolItem tool={mockTool} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('test-tool-123');
    });

    it('displays N/A when ToolId is missing', () => {
        const toolWithoutId = {};

        cloudscapeRender(<ToolItem tool={toolWithoutId as any} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('N/A');
    });

    it('displays N/A when ToolId is empty string', () => {
        const toolWithEmptyId = {
            ToolId: ''
        };

        cloudscapeRender(<ToolItem tool={toolWithEmptyId} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('N/A');
    });

    it('renders with correct test id based on index', () => {
        cloudscapeRender(<ToolItem tool={mockTool} index={5} />);

        expect(screen.getByTestId('tool-id-5')).toBeInTheDocument();
    });

    it('renders different tool IDs correctly', () => {
        const tool1 = { ToolId: 'tool-alpha' };
        const tool2 = { ToolId: 'tool-beta' };

        const { rerender } = cloudscapeRender(<ToolItem tool={tool1} index={0} />);
        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('tool-alpha');

        rerender(<ToolItem tool={tool2} index={0} />);
        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('tool-beta');
    });

    it('renders with ValueWithLabel component', () => {
        const { container } = cloudscapeRender(<ToolItem tool={mockTool} index={0} />);

        // ValueWithLabel should render the label
        expect(screen.getByText('Tool ID')).toBeInTheDocument();
    });

    it('handles null tool gracefully', () => {
        cloudscapeRender(<ToolItem tool={null as any} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('N/A');
    });

    it('handles undefined tool gracefully', () => {
        cloudscapeRender(<ToolItem tool={undefined as any} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('N/A');
    });

    it('renders tool with special characters in ID', () => {
        const toolWithSpecialChars = {
            ToolId: 'tool-123_ABC-xyz'
        };

        cloudscapeRender(<ToolItem tool={toolWithSpecialChars} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('tool-123_ABC-xyz');
    });

    it('renders tool with long ID', () => {
        const toolWithLongId = {
            ToolId: 'very-long-tool-id-with-many-characters-and-hyphens-12345678901234567890'
        };

        cloudscapeRender(<ToolItem tool={toolWithLongId} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent(
            'very-long-tool-id-with-many-characters-and-hyphens-12345678901234567890'
        );
    });

    it('renders multiple tool items with different indices', () => {
        const { container, rerender } = cloudscapeRender(<ToolItem tool={mockTool} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toBeInTheDocument();

        rerender(<ToolItem tool={{ ToolId: 'tool-2' }} index={1} />);
        expect(screen.getByTestId('tool-id-1')).toBeInTheDocument();
    });

    it('handles tool with additional properties', () => {
        const toolWithExtraProps = {
            ToolId: 'test-tool',
            ExtraProperty: 'should-be-ignored'
        };

        cloudscapeRender(<ToolItem tool={toolWithExtraProps as any} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('test-tool');
    });

    it('renders consistently across multiple renders', () => {
        const { rerender } = cloudscapeRender(<ToolItem tool={mockTool} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('test-tool-123');

        rerender(<ToolItem tool={mockTool} index={0} />);

        expect(screen.getByTestId('tool-id-0')).toHaveTextContent('test-tool-123');
    });
});
