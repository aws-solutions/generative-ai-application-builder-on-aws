// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnableProvisionedConcurrencyRadio } from '../EnableProvisionedConcurrency';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';

describe('EnableProvisionedConcurrencyRadio', () => {
    const defaultProps = {
        provisionedConcurrencyValue: 0,
        ...mockFormComponentCallbacks()
    };

    test('renders radio group with default "No" selection', () => {
        render(<EnableProvisionedConcurrencyRadio {...defaultProps} />);
        
        expect(screen.getByText('Do you want to enable provisioned concurrency?')).toBeInTheDocument();
        expect(screen.getByDisplayValue('No')).toBeChecked();
        expect(screen.getByDisplayValue('Yes')).not.toBeChecked();
    });

    test('shows concurrency value input when "Yes" is selected', () => {
        const props = {
            ...defaultProps,
            provisionedConcurrencyValue: 1
        };
        
        render(<EnableProvisionedConcurrencyRadio {...props} />);
        
        expect(screen.getByDisplayValue('Yes')).toBeChecked();
        expect(screen.getByTestId('provisioned-concurrency-value-input')).toBeInTheDocument();
        expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    test('shows warning alert when provisioned concurrency is enabled', () => {
        const props = {
            ...defaultProps,
            provisionedConcurrencyValue: 2
        };
        
        render(<EnableProvisionedConcurrencyRadio {...props} />);
        
        expect(screen.getByText(/Enabling provisioned concurrency will incur additional Lambda costs/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Lambda pricing Opens in a new tab' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Lambda pricing Opens in a new tab' })).toHaveAttribute('href', 'https://aws.amazon.com/lambda/pricing/');
    });

    test('calls onChangeFn when radio selection changes', async () => {
        const user = userEvent.setup();
        const mockOnChangeFn = vi.fn();
        const props = {
            ...defaultProps,
            onChangeFn: mockOnChangeFn
        };
        
        render(<EnableProvisionedConcurrencyRadio {...props} />);
        
        await user.click(screen.getByDisplayValue('Yes'));
        
        expect(mockOnChangeFn).toHaveBeenCalledWith({
            provisionedConcurrencyValue: 1
        });
    });

    test('calls onChangeFn when concurrency value changes', () => {
        const mockOnChangeFn = vi.fn();
        const props = {
            ...defaultProps,
            provisionedConcurrencyValue: 1,
            onChangeFn: mockOnChangeFn
        };
        
        const { cloudscapeWrapper } = renderWithProvider(<EnableProvisionedConcurrencyRadio {...props} />, { route: '/test' });
        
        const input = cloudscapeWrapper.findInput('[data-testid="provisioned-concurrency-value-input"]');
        input?.setInputValue('3');
        
        expect(mockOnChangeFn).toHaveBeenCalledWith({
            provisionedConcurrencyValue: 3
        });
    });

    test('shows validation errors for invalid concurrency values', () => {
        const mockOnChangeFn = vi.fn();
        const mockSetNumFieldsInError = vi.fn();
        const props = {
            ...defaultProps,
            provisionedConcurrencyValue: 1,
            onChangeFn: mockOnChangeFn,
            setNumFieldsInError: mockSetNumFieldsInError
        };
        
        const { cloudscapeWrapper } = renderWithProvider(<EnableProvisionedConcurrencyRadio {...props} />, { route: '/test' });
        
        const input = cloudscapeWrapper.findInput('[data-testid="provisioned-concurrency-value-input"]');
        
        // Test upper bound validation
        input?.setInputValue('10');
        expect(mockSetNumFieldsInError).toHaveBeenCalled();
        
        // Test lower bound validation  
        input?.setInputValue('0');
        expect(mockSetNumFieldsInError).toHaveBeenCalled();
        
        // Test non-integer validation
        input?.setInputValue('2.5');
        expect(mockSetNumFieldsInError).toHaveBeenCalled();
    });

    test('hides concurrency input and warning when "No" is selected', () => {
        render(<EnableProvisionedConcurrencyRadio {...defaultProps} />);
        
        expect(screen.queryByTestId('provisioned-concurrency-value-input')).not.toBeInTheDocument();
        expect(screen.queryByText(/Enabling provisioned concurrency will incur additional Lambda costs/)).not.toBeInTheDocument();
    });

    test('calls setHelpPanelContent when info link is clicked', async () => {
        const user = userEvent.setup();
        const mockSetHelpPanelContent = vi.fn();
        const props = {
            ...defaultProps,
            setHelpPanelContent: mockSetHelpPanelContent
        };
        
        render(<EnableProvisionedConcurrencyRadio {...props} />);
        
        const infoLink = screen.getByLabelText('Information about enabling provisioned concurrency.');
        await user.click(infoLink);
        
        expect(mockSetHelpPanelContent).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Provisioned Concurrency'
            })
        );
    });
});
