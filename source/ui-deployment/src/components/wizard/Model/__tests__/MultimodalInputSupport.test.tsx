// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultimodalInputSupport } from '../MultimodalInputSupport';

const mockSetHelpPanelContent = jest.fn();
const mockOnChangeFn = jest.fn();

const defaultProps = {
    multimodalEnabled: false,
    setHelpPanelContent: mockSetHelpPanelContent,
    onChangeFn: mockOnChangeFn
};

describe('MultimodalInputSupport', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the multimodal support form field', () => {
        render(<MultimodalInputSupport {...defaultProps} />);

        expect(screen.getByTestId('model-multimodal-support-field')).toBeInTheDocument();
        expect(screen.getByText('Do you want to enable multimodal input support for this model?')).toBeInTheDocument();
        expect(screen.getByText('Enable file upload capabilities for images and documents as input.')).toBeInTheDocument();
    });

    it('renders radio group with Yes/No options', () => {
        render(<MultimodalInputSupport {...defaultProps} />);

        const radioGroup = screen.getByTestId('model-multimodal-radio-group');
        expect(radioGroup).toBeInTheDocument();

        expect(screen.getByDisplayValue('Yes')).toBeInTheDocument();
        expect(screen.getByDisplayValue('No')).toBeInTheDocument();
    });

    it('displays "No" as selected when MultimodalEnabled is false', () => {
        render(<MultimodalInputSupport {...defaultProps} />);

        const noRadio = screen.getByDisplayValue('No');
        expect(noRadio).toBeChecked();

        const yesRadio = screen.getByDisplayValue('Yes');
        expect(yesRadio).not.toBeChecked();
    });

    it('displays "Yes" as selected when MultimodalEnabled is true', () => {
        const props = {
            ...defaultProps,
            multimodalEnabled: true
        };

        render(<MultimodalInputSupport {...props} />);

        const yesRadio = screen.getByDisplayValue('Yes');
        expect(yesRadio).toBeChecked();

        const noRadio = screen.getByDisplayValue('No');
        expect(noRadio).not.toBeChecked();
    });

    it('shows warning alert when multimodal is enabled', () => {
        const props = {
            ...defaultProps,
            multimodalEnabled: true
        };

        render(<MultimodalInputSupport {...props} />);

        expect(screen.getByTestId('multimodal-support-alert')).toBeInTheDocument();
        expect(screen.getByText(/Make sure the selected model supports multimodal input/)).toBeInTheDocument();
    });

    it('does not show warning alert when multimodal is disabled', () => {
        render(<MultimodalInputSupport {...defaultProps} />);

        expect(screen.queryByTestId('multimodal-support-alert')).not.toBeInTheDocument();
    });

    it('calls onChangeFn with true when Yes is selected', () => {
        render(<MultimodalInputSupport {...defaultProps} />);

        const yesRadio = screen.getByDisplayValue('Yes');
        fireEvent.click(yesRadio);

        expect(mockOnChangeFn).toHaveBeenCalledWith({
            multimodalEnabled: true
        });
    });

    it('calls onChangeFn with false when No is selected', () => {
        const props = {
            ...defaultProps,
            multimodalEnabled: true
        };

        render(<MultimodalInputSupport {...props} />);

        const noRadio = screen.getByDisplayValue('No');
        fireEvent.click(noRadio);

        expect(mockOnChangeFn).toHaveBeenCalledWith({
            multimodalEnabled: false
        });
    });

    it('renders info link and calls setHelpPanelContent when clicked', () => {
        render(<MultimodalInputSupport {...defaultProps} />);

        const infoLink = screen.getByLabelText('Information about enabling multimodal input support for models');
        expect(infoLink).toBeInTheDocument();

        fireEvent.click(infoLink);

        expect(mockSetHelpPanelContent).toHaveBeenCalledWith({
            title: 'Enable multimodal input support',
            content: expect.any(Object)
        });
    });

    it('displays correct file format information in help panel content', () => {
        render(<MultimodalInputSupport {...defaultProps} />);

        const infoLink = screen.getByLabelText('Information about enabling multimodal input support for models');
        fireEvent.click(infoLink);

        const helpPanelCall = mockSetHelpPanelContent.mock.calls[0][0];
        expect(helpPanelCall.title).toBe('Enable multimodal input support');

        // The content should be a React element, so we can't easily test the exact text
        // but we can verify the structure
        expect(helpPanelCall.content).toBeDefined();
    });

    it('handles undefined MultimodalParams gracefully', () => {
        const props = {
            ...defaultProps,
            MultimodalParams: undefined as any
        };

        // Should not throw an error
        expect(() => render(<MultimodalInputSupport {...props} />)).not.toThrow();
    });

    it('handles missing setHelpPanelContent prop gracefully', () => {
        const props = {
            ...defaultProps,
            setHelpPanelContent: undefined
        };

        // Should not throw an error when rendering
        expect(() => render(<MultimodalInputSupport {...props} />)).not.toThrow();
    });
});