// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import DisambiguationPromptConfiguration from '../DisambiguationPromptConfiguration';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';
import wrapper from '@cloudscape-design/components/test-utils/dom';

describe('DisambiguationPromptConfiguration', () => {
    const dataTestId = 'disambiguation-prompt-config-test-id';
    const mockProps = {
        disambiguationEnabled: true,
        defaultDisambiguationPromptTemplate: '{history}{input}',
        disambiguationPromptTemplate: '{history}{input}',
        maxPromptTemplateLength: 10000,
        defaultHumanPrefix: 'Human',
        humanPrefix: 'Human',
        defaultAiPrefix: 'AI',
        aiPrefix: 'AI',
        setDisambiguationPromptInError: vi.fn() as React.Dispatch<React.SetStateAction<boolean>>,
        'data-testid': dataTestId,
        onChangeFn: vi.fn(),
        setNumFieldsInError: vi.fn(),
        setHelpPanelContent: vi.fn()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders disambiguation prompt configuration', async () => {
        renderWithProvider(<DisambiguationPromptConfiguration {...mockProps} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        expect(screen.getByTestId(dataTestId)).toBeDefined();
    });

    test('renders with disambiguation disabled', async () => {
        const disabledProps = {
            ...mockProps,
            disambiguationEnabled: false
        };

        let { cloudscapeWrapper } = renderWithProvider(<DisambiguationPromptConfiguration {...disabledProps} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        expect(
            cloudscapeWrapper
                .findTextarea(`[data-testid="${dataTestId}-prompt-template-textarea"]`)!
                .findNativeTextarea()
                .getElement()
        ).toBeDisabled();
    });

    describe('required placeholder validation', () => {
        test('shows error when prompt template is empty', async () => {
            const emptyPromptProps = {
                ...mockProps,
                disambiguationPromptTemplate: ''
            };

            let { cloudscapeWrapper } = renderWithProvider(
                <DisambiguationPromptConfiguration {...emptyPromptProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(
                cloudscapeWrapper.findFormField(`[data-testid="${dataTestId}-prompt-template-field"]`)!.findError()
            ).toBeDefined();
        });

        test('shows error when {input} placeholder is missing', async () => {
            const missingInputProps = {
                ...mockProps,
                disambiguationPromptTemplate: 'This is a prompt with only {history}'
            };

            let { cloudscapeWrapper } = renderWithProvider(
                <DisambiguationPromptConfiguration {...missingInputProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(
                cloudscapeWrapper.findFormField(`[data-testid="${dataTestId}-prompt-template-field"]`)!.findError()
            ).toBeDefined();
        });

        test('shows error when {history} placeholder is missing', async () => {
            const missingHistoryProps = {
                ...mockProps,
                disambiguationPromptTemplate: 'This is a prompt with only {input}'
            };

            let { cloudscapeWrapper } = renderWithProvider(
                <DisambiguationPromptConfiguration {...missingHistoryProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(
                cloudscapeWrapper.findFormField(`[data-testid="${dataTestId}-prompt-template-field"]`)!.findError()
            ).toBeDefined();
        });

        test('shows error when both placeholders are missing', async () => {
            const missingBothProps = {
                ...mockProps,
                disambiguationPromptTemplate: 'This is a prompt with no placeholders'
            };

            let { cloudscapeWrapper } = renderWithProvider(
                <DisambiguationPromptConfiguration {...missingBothProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(
                cloudscapeWrapper.findFormField(`[data-testid="${dataTestId}-prompt-template-field"]`)!.findError()
            ).toBeDefined();
        });
    });

    describe('duplicate placeholder validation', () => {
        test('shows error when {input} placeholder is duplicated', async () => {
            const duplicateInputProps = {
                ...mockProps,
                disambiguationPromptTemplate: '{history}{input}{input}'
            };

            let { cloudscapeWrapper } = renderWithProvider(
                <DisambiguationPromptConfiguration {...duplicateInputProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(
                cloudscapeWrapper.findFormField(`[data-testid="${dataTestId}-prompt-template-field"]`)!.findError()
            ).toBeDefined();
        });

        test('shows error when {history} placeholder is duplicated', async () => {
            const duplicateHistoryProps = {
                ...mockProps,
                disambiguationPromptTemplate: '{history}{input}{history}'
            };

            let { cloudscapeWrapper } = renderWithProvider(
                <DisambiguationPromptConfiguration {...duplicateHistoryProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(
                cloudscapeWrapper.findFormField(`[data-testid="${dataTestId}-prompt-template-field"]`)!.findError()
            ).toBeDefined();
        });
    });

    test('shows error when prompt exceeds maximum length', async () => {
        // Create a prompt that exceeds the maximum length
        const maxLength = 100; // Use a small value for testing
        const longPrompt = 'A'.repeat(maxLength + 1) + '{history}{input}';

        let longPromptProps = {
            ...mockProps,
            maxPromptTemplateLength: maxLength,
            disambiguationPromptTemplate: longPrompt
        };

        let { cloudscapeWrapper } = renderWithProvider(<DisambiguationPromptConfiguration {...longPromptProps} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        //should be in error state
        expect(
            cloudscapeWrapper.findFormField(`[data-testid="${dataTestId}-prompt-template-field"]`)!.findError()
        ).toBeDefined();

        //now let's increase the max length and error should go away
        longPromptProps = {
            ...longPromptProps,
            maxPromptTemplateLength: longPrompt.length
        };

        cloudscapeWrapper = renderWithProvider(<DisambiguationPromptConfiguration {...longPromptProps} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        }).cloudscapeWrapper;

        //error should not exist any more
        expect(
            cloudscapeWrapper.findFormField(`[data-testid="${dataTestId}-prompt-template-field"]`)!.findError()
        ).toBeNull();
    });

    test('calls onChangeFn when disambiguation prompt template is changed', async () => {
        let { cloudscapeWrapper } = renderWithProvider(<DisambiguationPromptConfiguration {...mockProps} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        const promptTemplateTextarea = cloudscapeWrapper.findTextarea(
            `[data-testid="${dataTestId}-prompt-template-textarea"]`
        );
        promptTemplateTextarea!.setTextareaValue('New prompt template with {history} and {input}');

        expect(mockProps.onChangeFn).toHaveBeenCalledWith({
            disambiguationPromptTemplate: 'New prompt template with {history} and {input}'
        });
    });

    describe('Disambiguation enabled/disabled toggle', () => {
        test('calls onChangeFn when disambiguation is enabled', async () => {
            const disabledProps = {
                ...mockProps,
                disambiguationEnabled: false
            };

            let { cloudscapeWrapper } = renderWithProvider(<DisambiguationPromptConfiguration {...disabledProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            const radioGroup = cloudscapeWrapper.findRadioGroup(
                `[data-testid="${dataTestId}-enable-disambiguation-radio"]`
            );
            radioGroup!.findInputByValue('true')!.click();

            expect(mockProps.onChangeFn).toHaveBeenCalledWith({ disambiguationEnabled: true });
        });

        test('calls onChangeFn when disambiguation is disabled', async () => {
            let { cloudscapeWrapper } = renderWithProvider(<DisambiguationPromptConfiguration {...mockProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            const radioGroup = cloudscapeWrapper.findRadioGroup(
                `[data-testid="${dataTestId}-enable-disambiguation-radio"]`
            );
            radioGroup!.findInputByValue('false')!.click();

            expect(mockProps.onChangeFn).toHaveBeenCalledWith({ disambiguationEnabled: false });
        });
    });

    describe('Reset to default functionality', () => {
        test('reset button is disabled when all values are at defaults', async () => {
            let { cloudscapeWrapper } = renderWithProvider(<DisambiguationPromptConfiguration {...mockProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            const resetButton = cloudscapeWrapper.findButton(`[data-testid="${dataTestId}-reset-button"]`);
            expect(resetButton!.getElement()).toBeDisabled();
        });

        test('reset button is enabled when prompt template is changed', async () => {
            const changedPromptProps = {
                ...mockProps,
                disambiguationPromptTemplate: 'Changed {history}{input}'
            };

            let { cloudscapeWrapper } = renderWithProvider(
                <DisambiguationPromptConfiguration {...changedPromptProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            const resetButton = cloudscapeWrapper.findButton(`[data-testid="${dataTestId}-reset-button"]`);
            expect(resetButton!.getElement()).not.toBeDisabled();
        });

        test('clicking reset button resets all values to defaults', async () => {
            // Setup props with changed values
            const changedProps = {
                ...mockProps,
                disambiguationPromptTemplate: 'Changed {history}{input}',
                humanPrefix: 'Customer',
                aiPrefix: 'Bot'
            };

            let { cloudscapeWrapper } = renderWithProvider(<DisambiguationPromptConfiguration {...changedProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Click the reset button
            const resetButton = cloudscapeWrapper.findButton(`[data-testid="${dataTestId}-reset-button"]`);
            resetButton!.click();

            // Find the modal
            const modalWrapper = wrapper(document.body).findModal();
            expect(modalWrapper!.isVisible()).toBeTruthy();

            // Get all buttons in the modal footer
            const footerButtons = modalWrapper!.findFooter()!.findAll('button');

            // Find the button with text "Reset" (should be the second button)
            const resetButtonInModal = footerButtons[1]; // The second button should be "Reset"
            expect(resetButtonInModal).toBeDefined();

            // Click the reset button in the modal
            resetButtonInModal.click();

            // Verify onChangeFn was called with default values
            expect(mockProps.onChangeFn).toHaveBeenCalledWith({
                disambiguationPromptTemplate: mockProps.defaultDisambiguationPromptTemplate
            });
        });
    });
});
