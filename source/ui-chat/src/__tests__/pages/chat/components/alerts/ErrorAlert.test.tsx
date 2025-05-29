// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// ErrorAlert.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { ErrorAlert } from '../../../../../pages/chat/components/alerts/ErrorAlert';
import { TraceDetails } from '../../../../../utils/validation';

describe('ErrorAlert', () => {
    const mockTraceDetails: TraceDetails = {
        message: 'Test error message',
        rootId: 'root-123',
        parentId: 'parent-456',
        lineage: 'lineage-789',
        sampled: true
    };

    const mockFormatTraceDetailsForCopy = vi.fn().mockReturnValue('formatted-trace-details');

    const defaultProps = {
        index: 0,
        errorMessage: mockTraceDetails,
        formatTraceDetailsForCopy: mockFormatTraceDetailsForCopy
    };

    it('renders the alert component with correct data-testid', () => {
        const { container } = render(<ErrorAlert {...defaultProps} />);
        const wrapper = createWrapper(container);

        const alert = wrapper.findAlert();
        expect(alert?.getElement()).toHaveAttribute('data-testid', 'error-alert0');
    });

    it('displays the error message correctly', () => {
        const { container } = render(<ErrorAlert {...defaultProps} />);
        const wrapper = createWrapper(container);

        expect(wrapper.findAlert()?.getElement().textContent).toContain(mockTraceDetails.message);
    });

    it('renders with custom header when provided', () => {
        const customHeader = 'Custom Error Header';
        const { container } = render(<ErrorAlert {...defaultProps} header={customHeader} />);
        const wrapper = createWrapper(container);

        expect(wrapper.findAlert()?.findHeader()?.getElement().textContent).toBe(customHeader);
    });

    it('renders without header when not provided', () => {
        const { container } = render(<ErrorAlert {...defaultProps} />);
        const wrapper = createWrapper(container);

        const alert = wrapper.findAlert();
        expect(alert?.findHeader()).toBeNull();
    });

    it('displays all trace details correctly', () => {
        const { container } = render(<ErrorAlert {...defaultProps} />);
        const wrapper = createWrapper(container);

        const alertContent = wrapper.findAlert()?.getElement().textContent;
        expect(alertContent).toContain(`Root ID: ${mockTraceDetails.rootId}`);
        expect(alertContent).toContain(`Parent ID: ${mockTraceDetails.parentId}`);
        expect(alertContent).toContain(`Lineage: ${mockTraceDetails.lineage}`);
        expect(alertContent).toContain('Sampled: Yes');
    });

    it('renders CopyToClipboard with correct props', () => {
        const { container } = render(<ErrorAlert {...defaultProps} />);

        const copyButton = createWrapper(container).findCopyToClipboard();
        expect(copyButton).toBeTruthy();

        expect(mockFormatTraceDetailsForCopy).toHaveBeenCalledWith(mockTraceDetails);
    });

    it('shows "No" for sampled when false', () => {
        const unsampledTraceDetails: TraceDetails = {
            ...mockTraceDetails,
            sampled: false
        };

        const { container } = render(<ErrorAlert {...defaultProps} errorMessage={unsampledTraceDetails} />);
        const wrapper = createWrapper(container);

        const alertContent = wrapper.findAlert()?.getElement().textContent;
        expect(alertContent).toContain('Sampled: No');
    });

    it('uses correct index in data-testid', () => {
        const testIndex = 5;
        const { container } = render(<ErrorAlert {...defaultProps} index={testIndex} />);
        const wrapper = createWrapper(container);

        const alert = wrapper.findAlert();
        expect(alert?.getElement()).toHaveAttribute('data-testid', 'error-alert5');
    });
});
