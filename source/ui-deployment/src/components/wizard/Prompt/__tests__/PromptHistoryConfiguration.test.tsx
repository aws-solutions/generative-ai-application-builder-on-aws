// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import PromptHistoryConfiguration from '../PromptHistoryConfiguration';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';
import wrapper from '@cloudscape-design/components/test-utils/dom';
import { MODEL_PROVIDER_NAME_MAP } from '../../steps-config';

describe('PromptHistoryConfiguration', () => {
    const dataTestId = 'prompt-history-config-test-id';
    const mockProps = {
        defaultChatHistoryLength: 10,
        chatHistoryLength: 10,
        defaultHumanPrefix: 'Human:',
        humanPrefix: 'Human:',
        defaultAiPrefix: 'AI:',
        aiPrefix: 'AI:',
        modelProvider: MODEL_PROVIDER_NAME_MAP.SageMaker,
        setHistoryConfigurationInError: vi.fn() as React.Dispatch<React.SetStateAction<boolean>>,
        'data-testid': dataTestId,
        onChangeFn: vi.fn(),
        setNumFieldsInError: vi.fn(),
        setHelpPanelContent: vi.fn()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders prompt history configuration', async () => {
        renderWithProvider(<PromptHistoryConfiguration {...mockProps} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        expect(screen.getByTestId(dataTestId)).toBeDefined();
    });

    describe('SageMaker model provider', () => {
        test('always shows human and AI prefix fields', async () => {
            const { cloudscapeWrapper } = renderWithProvider(<PromptHistoryConfiguration {...mockProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Check that both prefix fields are rendered using data-testid
            expect(screen.getByTestId(`${dataTestId}-human-prefix-field`)).toBeDefined();
            expect(screen.getByTestId(`${dataTestId}-ai-prefix-field`)).toBeDefined();
        });

        test('prefix fields are always enabled', async () => {
            const { cloudscapeWrapper } = renderWithProvider(
                <PromptHistoryConfiguration {...mockProps} isRag={false} disambiguationEnabled={false} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Check that both prefix inputs are enabled using data-testid
            const humanPrefixInput = cloudscapeWrapper.findInput(`[data-testid="${dataTestId}-human-prefix-input"]`);
            const aiPrefixInput = cloudscapeWrapper.findInput(`[data-testid="${dataTestId}-ai-prefix-input"]`);

            expect(humanPrefixInput!.getElement()).not.toBeDisabled();
            expect(aiPrefixInput!.getElement()).not.toBeDisabled();
        });
    });

    describe('Bedrock model provider', () => {
        test('hides prefix fields when RAG is disabled', async () => {
            const bedrockProps = {
                ...mockProps,
                modelProvider: MODEL_PROVIDER_NAME_MAP.Bedrock,
                isRag: false
            };

            renderWithProvider(<PromptHistoryConfiguration {...bedrockProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Check that prefix fields are not rendered
            expect(screen.queryByTestId(`${dataTestId}-human-prefix-field`)).toBeNull();
            expect(screen.queryByTestId(`${dataTestId}-ai-prefix-field`)).toBeNull();
        });

        test('shows prefix fields when RAG is enabled', async () => {
            const bedrockRagProps = {
                ...mockProps,
                modelProvider: MODEL_PROVIDER_NAME_MAP.Bedrock,
                isRag: true
            };

            renderWithProvider(<PromptHistoryConfiguration {...bedrockRagProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Check that prefix fields are rendered
            expect(screen.getByTestId(`${dataTestId}-human-prefix-field`)).toBeDefined();
            expect(screen.getByTestId(`${dataTestId}-ai-prefix-field`)).toBeDefined();
        });

        test('disables prefix fields when disambiguation is disabled', async () => {
            const bedrockRagNoDisambiguationProps = {
                ...mockProps,
                modelProvider: MODEL_PROVIDER_NAME_MAP.Bedrock,
                isRag: true,
                disambiguationEnabled: false
            };

            const { cloudscapeWrapper } = renderWithProvider(
                <PromptHistoryConfiguration {...bedrockRagNoDisambiguationProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Check that prefix inputs are disabled
            const humanPrefixInput = cloudscapeWrapper.findInput(`[data-testid="${dataTestId}-human-prefix-input"]`);
            const aiPrefixInput = cloudscapeWrapper.findInput(`[data-testid="${dataTestId}-ai-prefix-input"]`);

            expect(humanPrefixInput?.isDisabled()).toBeTruthy();
            expect(aiPrefixInput?.isDisabled()).toBeTruthy();
        });

        test('enables prefix fields when disambiguation is enabled', async () => {
            const bedrockRagWithDisambiguationProps = {
                ...mockProps,
                modelProvider: MODEL_PROVIDER_NAME_MAP.Bedrock,
                isRag: true,
                disambiguationEnabled: true
            };

            const { cloudscapeWrapper } = renderWithProvider(
                <PromptHistoryConfiguration {...bedrockRagWithDisambiguationProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Check that prefix inputs are enabled
            const humanPrefixInput = cloudscapeWrapper.findInput(`[data-testid="${dataTestId}-human-prefix-input"]`);
            const aiPrefixInput = cloudscapeWrapper.findInput(`[data-testid="${dataTestId}-ai-prefix-input"]`);

            expect(humanPrefixInput!.getElement()).not.toBeDisabled();
            expect(aiPrefixInput!.getElement()).not.toBeDisabled();
        });
    });

    describe('Input validation', () => {
        test('shows error when chat history length is not an integer', async () => {
            const invalidHistoryLengthProps = {
                ...mockProps,
                chatHistoryLength: 10.5
            };

            const { cloudscapeWrapper } = renderWithProvider(
                <PromptHistoryConfiguration {...invalidHistoryLengthProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Find the error message using data-testid
            const historyLengthField = cloudscapeWrapper.findFormField(
                `[data-testid="${dataTestId}-history-length-field"]`
            );
            expect(historyLengthField!.findError()).toBeDefined();
        });

        test('shows error when chat history length is negative', async () => {
            const negativeHistoryLengthProps = {
                ...mockProps,
                chatHistoryLength: -1
            };

            const { cloudscapeWrapper } = renderWithProvider(
                <PromptHistoryConfiguration {...negativeHistoryLengthProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Find the error message using data-testid
            const historyLengthField = cloudscapeWrapper.findFormField(
                `[data-testid="${dataTestId}-history-length-field"]`
            );
            expect(historyLengthField!.findError()).toBeDefined();
        });

        test('shows error when human prefix is empty', async () => {
            const emptyHumanPrefixProps = {
                ...mockProps,
                humanPrefix: ''
            };

            const { cloudscapeWrapper } = renderWithProvider(
                <PromptHistoryConfiguration {...emptyHumanPrefixProps} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Find the error message using data-testid
            const humanPrefixField = cloudscapeWrapper.findFormField(
                `[data-testid="${dataTestId}-human-prefix-field"]`
            );
            expect(humanPrefixField!.findError()).toBeDefined();
        });

        test('shows error when AI prefix is empty', async () => {
            const emptyAiPrefixProps = {
                ...mockProps,
                aiPrefix: ''
            };

            const { cloudscapeWrapper } = renderWithProvider(<PromptHistoryConfiguration {...emptyAiPrefixProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Find the error message using data-testid
            const aiPrefixField = cloudscapeWrapper.findFormField(`[data-testid="${dataTestId}-ai-prefix-field"]`);
            expect(aiPrefixField!.findError()).toBeDefined();
        });
    });

    describe('Input changes', () => {
        test('calls onChangeFn when chat history length is changed', async () => {
            const { cloudscapeWrapper } = renderWithProvider(<PromptHistoryConfiguration {...mockProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Find the input using data-testid and change its value
            const historyLengthInput = cloudscapeWrapper.findInput(
                `[data-testid="${dataTestId}-history-length-input"]`
            );
            historyLengthInput!.setInputValue('20');

            // Check that onChangeFn was called with the new value
            expect(mockProps.onChangeFn).toHaveBeenCalledWith({ chatHistoryLength: 20 });
        });

        test('calls onChangeFn when human prefix is changed', async () => {
            const { cloudscapeWrapper } = renderWithProvider(<PromptHistoryConfiguration {...mockProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Find the input using data-testid and change its value
            const humanPrefixInput = cloudscapeWrapper.findInput(`[data-testid="${dataTestId}-human-prefix-input"]`);
            humanPrefixInput!.setInputValue('User:');

            // Check that onChangeFn was called with the new value
            expect(mockProps.onChangeFn).toHaveBeenCalledWith({ humanPrefix: 'User:' });
        });

        test('calls onChangeFn when AI prefix is changed', async () => {
            const { cloudscapeWrapper } = renderWithProvider(<PromptHistoryConfiguration {...mockProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Find the input using data-testid and change its value
            const aiPrefixInput = cloudscapeWrapper.findInput(`[data-testid="${dataTestId}-ai-prefix-input"]`);
            aiPrefixInput!.setInputValue('Assistant:');

            // Check that onChangeFn was called with the new value
            expect(mockProps.onChangeFn).toHaveBeenCalledWith({ aiPrefix: 'Assistant:' });
        });
    });

    describe('Reset to default functionality', () => {
        test('reset button is disabled when all values are at defaults', async () => {
            const { cloudscapeWrapper } = renderWithProvider(<PromptHistoryConfiguration {...mockProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Find the reset button using data-testid
            const resetButton = cloudscapeWrapper.findButton(`[data-testid="${dataTestId}-reset-button"]`);
            expect(resetButton!.getElement()).toBeDisabled();
        });

        test('reset button is enabled when values are changed', async () => {
            const changedProps = {
                ...mockProps,
                chatHistoryLength: 20,
                humanPrefix: 'User:',
                aiPrefix: 'Assistant:'
            };

            const { cloudscapeWrapper } = renderWithProvider(<PromptHistoryConfiguration {...changedProps} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Find the reset button using data-testid
            const resetButton = cloudscapeWrapper.findButton(`[data-testid="${dataTestId}-reset-button"]`);
            expect(resetButton!.getElement()).not.toBeDisabled();
        });

        test('clicking reset button resets all values to defaults', async () => {
            const changedProps = {
                ...mockProps,
                chatHistoryLength: 20,
                humanPrefix: 'User:',
                aiPrefix: 'Assistant:'
            };

            const { cloudscapeWrapper } = renderWithProvider(<PromptHistoryConfiguration {...changedProps} />, {
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
                chatHistoryLength: mockProps.defaultChatHistoryLength,
                humanPrefix: mockProps.defaultHumanPrefix,
                aiPrefix: mockProps.defaultAiPrefix
            });
        });
    });
});
