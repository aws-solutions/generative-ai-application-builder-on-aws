// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import SystemPrompt from '../SystemPrompt';
import { USECASE_TYPE_ROUTE, DEFAULT_AGENT_SYSTEM_PROMPT, MAX_AGENT_SYSTEM_PROMPT_LENGTH } from '@/utils/constants';

describe('SystemPrompt', () => {
    const dataTestId = 'system-prompt-test';
    const defaultProps = {
        defaultSystemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
        systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
        setNumFieldsInError: vi.fn(),
        setSystemPromptInError: vi.fn(),
        onChangeFn: vi.fn(),
        setHelpPanelContent: vi.fn(),
        'data-testid': dataTestId
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders system prompt with correct value', () => {
        const { cloudscapeWrapper } = renderWithProvider(<SystemPrompt {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(DEFAULT_AGENT_SYSTEM_PROMPT);
    });

    test('renders system prompt with custom value', () => {
        const customPrompt = 'You are a custom AI assistant with specific instructions.';
        const { cloudscapeWrapper } = renderWithProvider(
            <SystemPrompt {...defaultProps} systemPrompt={customPrompt} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(customPrompt);
    });

    test('allows setting new textarea value', () => {
        const { cloudscapeWrapper } = renderWithProvider(<SystemPrompt {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const textArea = cloudscapeWrapper.findTextarea();
        const newValue = 'New system prompt value';
        textArea?.focus();
        textArea?.setTextareaValue(newValue);

        // check if onChange got called
        expect(defaultProps.onChangeFn).toHaveBeenCalledWith({ systemPrompt: newValue });
    });

    test('shows error when system prompt is empty', () => {
        const { cloudscapeWrapper } = renderWithProvider(<SystemPrompt {...defaultProps} systemPrompt="" />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const formField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual('');
        expect(formField?.findError()?.getElement().textContent).toEqual('System prompt is required');
    });

    test('shows error when system prompt exceeds max length', () => {
        const longPrompt = 'a'.repeat(MAX_AGENT_SYSTEM_PROMPT_LENGTH + 1);
        const { cloudscapeWrapper } = renderWithProvider(<SystemPrompt {...defaultProps} systemPrompt={longPrompt} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const formField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(longPrompt);
        expect(formField?.findError()?.getElement().textContent).toEqual(
            `System prompt is too long. Character count: ${longPrompt.length}/${MAX_AGENT_SYSTEM_PROMPT_LENGTH}`
        );
    });

    test('no error when system prompt is valid', () => {
        const validPrompt = 'You are a helpful AI assistant.';
        const { cloudscapeWrapper } = renderWithProvider(
            <SystemPrompt {...defaultProps} systemPrompt={validPrompt} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const formField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(validPrompt);
        expect(formField?.findError()).toBeNull();
    });

    test('calls setSystemPromptInError with true when validation fails', () => {
        const mockSetSystemPromptInError = vi.fn();
        renderWithProvider(
            <SystemPrompt {...defaultProps} systemPrompt="" setSystemPromptInError={mockSetSystemPromptInError} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        expect(mockSetSystemPromptInError).toHaveBeenCalledWith(true);
    });

    test('calls setSystemPromptInError with false when validation passes', () => {
        const mockSetSystemPromptInError = vi.fn();
        renderWithProvider(<SystemPrompt {...defaultProps} setSystemPromptInError={mockSetSystemPromptInError} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(mockSetSystemPromptInError).toHaveBeenCalledWith(false);
    });

    test('renders reset button disabled when prompt equals default', () => {
        const { cloudscapeWrapper } = renderWithProvider(<SystemPrompt {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const resetButton = cloudscapeWrapper.findButton();
        expect(resetButton?.isDisabled()).toBe(true);
    });

    test('renders reset button enabled when prompt differs from default', () => {
        const { cloudscapeWrapper } = renderWithProvider(
            <SystemPrompt {...defaultProps} systemPrompt="Modified prompt" />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const resetButton = cloudscapeWrapper.findButton();
        expect(resetButton?.isDisabled()).toBe(false);
    });

    test('renders form field with correct label and description', () => {
        const { cloudscapeWrapper } = renderWithProvider(<SystemPrompt {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const formField = cloudscapeWrapper.findFormField();
        expect(formField?.findLabel()?.getElement().textContent).toEqual('System Prompt');
        expect(formField?.findDescription()?.getElement().textContent).toContain(
            'Define the behavior and personality of your AI agent'
        );
    });

    test('textarea has correct placeholder and attributes', () => {
        const { cloudscapeWrapper } = renderWithProvider(<SystemPrompt {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.findNativeTextarea().getElement()).toHaveAttribute(
            'placeholder',
            'Enter your system prompt here...'
        );
        expect(textArea?.findNativeTextarea().getElement()).toHaveAttribute('spellcheck', 'true');
    });

    test('renders container with correct header', () => {
        const { cloudscapeWrapper } = renderWithProvider(<SystemPrompt {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const container = cloudscapeWrapper.findContainer();
        expect(container?.findHeader()?.getElement().textContent).toContain('Prompt');
    });

    test('renders container with custom header title when headerTitle prop is provided', () => {
        const customTitle = 'Custom System Prompt';
        const { cloudscapeWrapper } = renderWithProvider(<SystemPrompt {...defaultProps} headerTitle={customTitle} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const container = cloudscapeWrapper.findContainer();
        expect(container?.findHeader()?.getElement().textContent).toContain(customTitle);
    });
});
