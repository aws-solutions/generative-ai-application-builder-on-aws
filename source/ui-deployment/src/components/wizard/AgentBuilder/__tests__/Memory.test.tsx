// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import Memory from '../Memory';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('Memory', () => {
    const dataTestId = 'memory-test';
    const defaultProps = {
        memoryEnabled: false,
        onChangeFn: vi.fn(),
        setHelpPanelContent: vi.fn(),
        setNumFieldsInError: vi.fn(),
        'data-testid': dataTestId
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders memory component with correct structure', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Memory {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const container = cloudscapeWrapper.findContainer();
        expect(container?.findHeader()?.getElement().textContent).toContain('Memory management');
    });

    test('renders with memory disabled by default', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Memory {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const radioGroup = cloudscapeWrapper.findRadioGroup();
        expect(radioGroup?.findInputByValue('no')?.getElement()).toBeChecked();
        expect(radioGroup?.findInputByValue('yes')?.getElement()).not.toBeChecked();
    });

    test('renders with memory enabled when prop is true', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Memory {...defaultProps} memoryEnabled={true} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const radioGroup = cloudscapeWrapper.findRadioGroup();
        expect(radioGroup?.findInputByValue('yes')?.getElement()).toBeChecked();
        expect(radioGroup?.findInputByValue('no')?.getElement()).not.toBeChecked();
    });

    test('calls onChangeFn with true when Yes is selected', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Memory {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const radioGroup = cloudscapeWrapper.findRadioGroup();
        radioGroup?.findInputByValue('yes')?.click();

        expect(defaultProps.onChangeFn).toHaveBeenCalledWith({ memoryEnabled: true });
    });

    test('calls onChangeFn with false when No is selected', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Memory {...defaultProps} memoryEnabled={true} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const radioGroup = cloudscapeWrapper.findRadioGroup();
        radioGroup?.findInputByValue('no')?.click();

        expect(defaultProps.onChangeFn).toHaveBeenCalledWith({ memoryEnabled: false });
    });

    test('renders form field with correct label and description', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Memory {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const formField = cloudscapeWrapper.findFormField();
        expect(formField?.findLabel()?.getElement().textContent).toEqual('Long-term Memory');
        expect(formField?.findDescription()?.getElement().textContent).toContain(
            'Enable your agent to retain information across multiple conversations'
        );
    });

    test('renders radio group with correct options and descriptions', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Memory {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const radioGroup = cloudscapeWrapper.findRadioGroup();

        // Check Yes option
        const yesOption = radioGroup?.findButtons()[0];
        expect(yesOption?.findLabel().getElement().textContent).toContain('Yes');
        expect(yesOption?.findDescription()?.getElement().textContent).toContain(
            'Store conversation data for extended periods to improve context retention'
        );

        // Check No option
        const noOption = radioGroup?.findButtons()[1];
        expect(noOption?.findLabel().getElement().textContent).toContain('No');
        expect(noOption?.findDescription()?.getElement().textContent).toContain(
            "Don't retain conversation history between sessions"
        );
    });

    test('renders info link for help panel', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Memory {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const formField = cloudscapeWrapper.findFormField();
        const infoLink = formField?.findInfo()?.findLink();
        expect(infoLink).toBeDefined();
    });

    test('calls setHelpPanelContent when info link is clicked', () => {
        const mockSetHelpPanelContent = vi.fn();
        const { cloudscapeWrapper } = renderWithProvider(
            <Memory {...defaultProps} setHelpPanelContent={mockSetHelpPanelContent} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const formField = cloudscapeWrapper.findFormField();
        const infoLink = formField?.findInfo()?.findLink();
        infoLink?.click();

        expect(mockSetHelpPanelContent).toHaveBeenCalled();
    });

    test('has correct data-testid attributes', () => {
        renderWithProvider(<Memory {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId('memory-header')).toBeDefined();
        expect(screen.getByTestId('memory-form-field')).toBeDefined();
        expect(screen.getByTestId('memory-radio-group')).toBeDefined();
        expect(screen.getByTestId('memory-info-link')).toBeDefined();
    });
});
