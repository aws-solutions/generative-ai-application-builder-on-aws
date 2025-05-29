// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, vi } from 'vitest';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { TestStoreFactory, testStoreFactory } from '@/__tests__/utils/test-redux-store-factory';
import { ChatInput } from '@/pages/chat/components/input/ChatInput';
import { CONSTRAINT_TEXT_ERROR_COLOR, DOCS_LINKS } from '@/utils/constants';
import { DEFAULT_AGENT_CONFIG, DEFAULT_TEXT_CONFIG } from '@/__tests__/utils/test-configs';

describe('ChatInput', () => {
    test('renders prompt input with correct default props', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />);
        const wrapper = createWrapper(container);

        const promptInput = wrapper.findPromptInput();
        expect(promptInput).toBeTruthy();
        expect(promptInput?.findNativeTextarea()?.getElement()).toHaveAttribute('placeholder', 'Ask a question');
    });

    test('shows correct aria labels when not loading', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />);
        const wrapper = createWrapper(container);

        const promptInput = wrapper.findPromptInput();
        expect(promptInput?.findNativeTextarea()?.getElement()).toHaveAttribute('aria-label', 'Chat input text');
        expect(promptInput?.findActionButton()?.getElement()).toHaveAttribute('aria-label', 'Send message');
    });

    test('shows correct aria labels when loading', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={true} onSend={onSend} />);
        const wrapper = createWrapper(container);

        const promptInput = wrapper.findPromptInput();
        expect(promptInput?.findNativeTextarea()?.getElement()).toHaveAttribute(
            'aria-label',
            'Chat input text - suppressed'
        );
        expect(promptInput?.findActionButton()?.getElement()).toHaveAttribute(
            'aria-label',
            'Send message button - suppressed'
        );
    });

    test('shows constraint text and character count for internal users', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />, {
            config: {
                runtimeConfig: {
                    ...DEFAULT_TEXT_CONFIG,
                    IsInternalUser: 'true'
                }
            }
        });
        const wrapper = createWrapper(container);

        const formField = wrapper.findFormField();
        const constraint = formField?.findConstraint();
        const link = constraint?.findLink();
        expect(link?.getElement().textContent).toContain('Third Party Generative AI Use Policy');
        expect(link?.getElement()).toHaveAttribute('href', DOCS_LINKS.GEN_AI_POLICY);
        expect(constraint?.getElement().textContent).toContain('0/240k characters');
    });

    test('shows only character count for external users', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />, {
            config: {
                runtimeConfig: {
                    ...DEFAULT_TEXT_CONFIG,
                    IsInternalUser: 'false'
                }
            }
        });
        const wrapper = createWrapper(container);

        const formField = wrapper.findFormField();
        const constraint = formField?.findConstraint();
        expect(constraint?.getElement().textContent).toContain('0/240k characters');
        expect(constraint?.findLink()).toBeFalsy();
    });

    test('calls onSend with input value when action button is clicked', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />);
        const wrapper = createWrapper(container);

        const promptInput = wrapper.findPromptInput();
        promptInput?.setTextareaValue('test message');
        promptInput?.findActionButton()?.click();

        expect(onSend).toHaveBeenCalledWith('test message');
    });

    test('does not call onSend when input is empty or whitespace', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />);
        const wrapper = createWrapper(container);

        const promptInput = wrapper.findPromptInput();

        // Test with empty string
        promptInput?.setTextareaValue('');
        promptInput?.findActionButton()?.click();
        expect(onSend).not.toHaveBeenCalled();

        // Test with whitespace
        promptInput?.setTextareaValue('   ');
        promptInput?.findActionButton()?.click();
        expect(onSend).not.toHaveBeenCalled();
    });

    test('does not call onSend when loading', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={true} onSend={onSend} />);
        const wrapper = createWrapper(container);

        const promptInput = wrapper.findPromptInput();
        promptInput?.setTextareaValue('test message');
        promptInput?.findActionButton()?.click();

        expect(onSend).not.toHaveBeenCalled();
    });

    test('clears input after successful send', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />);
        const wrapper = createWrapper(container);

        const promptInput = wrapper.findPromptInput();
        promptInput?.setTextareaValue('test message');
        promptInput?.findActionButton()?.click();

        expect(promptInput?.getTextareaValue()).toBe('');
    });

    test('prevents sending input beyond maximum length', () => {
        const onSend = vi.fn();
        const maxLength = 5;
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />, {
            config: {
                runtimeConfig: {
                    ...DEFAULT_TEXT_CONFIG,
                    UseCaseConfig: {
                        ...DEFAULT_TEXT_CONFIG.UseCaseConfig,
                        LlmParams: {
                            ...DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams,
                            PromptParams: {
                                ...DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams.PromptParams,
                                MaxInputTextLength: maxLength
                            }
                        }
                    }
                }
            }
        });
        const wrapper = createWrapper(container);

        const promptInput = wrapper.findPromptInput();
        promptInput?.setTextareaValue('test'); // Set exactly 4 characters

        const formField = wrapper.findFormField();
        const constraint = formField?.findConstraint();
        const counterSpan = constraint?.getElement().querySelector('span');

        // Test input within limit
        expect(constraint?.getElement().textContent).toContain(`4/${maxLength} characters`);
        expect(counterSpan).toHaveStyle({ color: 'inherit' });

        // Submit within limit
        promptInput?.findActionButton()?.click();
        expect(onSend).toHaveBeenCalledWith('test');

        // Try text at exactly the limit
        promptInput?.setTextareaValue('tests'); // Set 5 characters
        expect(promptInput?.getTextareaValue()).toBe('tests');
        expect(constraint?.getElement().textContent).toContain(`5/${maxLength} characters`);
        expect(counterSpan).toHaveStyle({ color: 'inherit' });

        // Submit at limit
        promptInput?.findActionButton()?.click();
        expect(onSend).toHaveBeenCalledWith('tests');

        // Try text beyond the limit
        promptInput?.setTextareaValue('testing'); // Set 7 characters
        expect(promptInput?.getTextareaValue()).toBe('testing');
        expect(constraint?.getElement().textContent).toContain(`7/${maxLength} characters`);
        expect(counterSpan).toHaveStyle({ color: CONSTRAINT_TEXT_ERROR_COLOR });

        // Attempt to submit beyond limit
        promptInput?.findActionButton()?.click();
        expect(onSend).toHaveBeenCalledTimes(2); // Should not have been called again
    });

    test('uses default max length when config is missing', () => {
        const onSend = vi.fn();
        const newTestStoreFactory = new TestStoreFactory();
        // Use agent config which doesn't have PromptParams.MaxInputTextLength defined
        const { container } = newTestStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />, {
            config: {
                runtimeConfig: {
                    ...DEFAULT_AGENT_CONFIG,
                    IsInternalUser: 'false',
                    // Explicitly ensure there are no PromptParams to test the fallback
                    UseCaseConfig: {
                        ...DEFAULT_AGENT_CONFIG.UseCaseConfig,
                        LlmParams: {
                            RAGEnabled: false
                        }
                    }
                }
            }
        });
        const wrapper = createWrapper(container);
        const formField = wrapper.findFormField();
        const constraint = formField?.findConstraint();
        expect(constraint?.getElement().textContent).toContain('0/10k characters.');
    });

    test('calls onSend with input value when action button is clicked', () => {
        const onSend = vi.fn();
        const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />);
        const wrapper = createWrapper(container);

        const promptInput = wrapper.findPromptInput();
        promptInput?.setTextareaValue('test message');
        promptInput?.findActionButton()?.click();

        expect(onSend).toHaveBeenCalledWith('test message');
    });
});
