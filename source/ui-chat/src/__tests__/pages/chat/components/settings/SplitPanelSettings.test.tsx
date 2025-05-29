// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { DEFAULT_TEXT_CONFIG } from '../../../../utils/test-configs';
import { testStoreFactory } from '../../../../utils/test-redux-store-factory';
import { SplitPanelSettings } from '../../../../../pages/chat/components/settings/SplitPanelSettings';
import { SplitPanelContextProvider } from '../../../../../contexts/SplitPanelContext';
import { MODEL_PROVIDER } from '../../../../../utils/constants';

describe('SplitPanelSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderSplitPanelSettings = (config = DEFAULT_TEXT_CONFIG, preferences = {}) => {
        const { container } = testStoreFactory.renderWithStore(
            <SplitPanelContextProvider>
                <SplitPanelSettings />
            </SplitPanelContextProvider>,
            {
                config: {
                    runtimeConfig: config
                },
                preferences
            }
        );
        return createWrapper(container);
    };

    it('renders with RAG disabled configuration for Bedrock', () => {
        const config = {
            ...DEFAULT_TEXT_CONFIG,
            UseCaseConfig: {
                ...DEFAULT_TEXT_CONFIG.UseCaseConfig,
                ModelProviderName: MODEL_PROVIDER.BEDROCK,
                LlmParams: {
                    RAGEnabled: false,
                    PromptParams: {
                        ...DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams.PromptParams,
                        PromptTemplate: 'Default template'
                    }
                }
            }
        };

        const wrapper = renderSplitPanelSettings(config);
        const formField = wrapper.findFormField()!;
        expect(formField.findConstraint()?.getElement()).toHaveTextContent('Maximum 240k characters.');
    });

    it('renders with RAG enabled configuration for Bedrock', () => {
        const config = {
            ...DEFAULT_TEXT_CONFIG,
            UseCaseConfig: {
                ...DEFAULT_TEXT_CONFIG.UseCaseConfig,
                ModelProviderName: MODEL_PROVIDER.BEDROCK,
                LlmParams: {
                    RAGEnabled: true,
                    PromptParams: {
                        ...DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams.PromptParams,
                        PromptTemplate: 'Default template with {context}'
                    }
                }
            }
        };

        const wrapper = renderSplitPanelSettings(config);
        const formField = wrapper.findFormField()!;
        expect(formField.findConstraint()?.getElement()).toHaveTextContent('Must include {context} exactly once.');
    });

    it('renders with RAG disabled configuration for SageMaker', () => {
        const config = {
            ...DEFAULT_TEXT_CONFIG,
            UseCaseConfig: {
                ...DEFAULT_TEXT_CONFIG.UseCaseConfig,
                ModelProviderName: MODEL_PROVIDER.SAGEMAKER,
                LlmParams: {
                    RAGEnabled: false,
                    PromptParams: {
                        ...DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams.PromptParams,
                        PromptTemplate: 'Default template with {input} and {history}'
                    }
                }
            }
        };

        const wrapper = renderSplitPanelSettings(config);
        const formField = wrapper.findFormField()!;
        // Use a partial match since the exact formatting might vary
        expect(formField.findConstraint()?.getElement().textContent).toContain(
            'Must include both {input} and {history}'
        );
    });

    it('renders with RAG enabled configuration for SageMaker', () => {
        const config = {
            ...DEFAULT_TEXT_CONFIG,
            UseCaseConfig: {
                ...DEFAULT_TEXT_CONFIG.UseCaseConfig,
                ModelProviderName: MODEL_PROVIDER.SAGEMAKER,
                LlmParams: {
                    RAGEnabled: true,
                    PromptParams: {
                        ...DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams.PromptParams,
                        PromptTemplate: 'Default template with {context}, {input}, and {history}'
                    }
                }
            }
        };

        const wrapper = renderSplitPanelSettings(config);
        const formField = wrapper.findFormField()!;
        // Use a partial match since the exact formatting might vary
        expect(formField.findConstraint()?.getElement().textContent).toContain('{context}');
        expect(formField.findConstraint()?.getElement().textContent).toContain('{input}');
        expect(formField.findConstraint()?.getElement().textContent).toContain('{history}');
    });

    it('shows default prompt template initially', () => {
        const config = {
            ...DEFAULT_TEXT_CONFIG,
            UseCaseConfig: {
                ...DEFAULT_TEXT_CONFIG.UseCaseConfig,
                LlmParams: {
                    RAGEnabled: false,
                    PromptParams: {
                        ...DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams.PromptParams,
                        PromptTemplate: 'Default template'
                    }
                }
            }
        };

        const wrapper = renderSplitPanelSettings(config);
        const textarea = wrapper.findTextarea()!;
        expect(textarea.getTextareaValue()).toBe('Default template');
    });

    it('validates prompt template format', () => {
        const wrapper = renderSplitPanelSettings(DEFAULT_TEXT_CONFIG);
        const textarea = wrapper.findTextarea()!;

        textarea?.setTextareaValue('Invalid template with placeholders such as {history} or {input}');

        const formField = wrapper.findFormField()!;
        expect(formField.findError()).not.toBeNull();
    });

    it('shows success notification when template is saved', () => {
        const wrapper = renderSplitPanelSettings(DEFAULT_TEXT_CONFIG);
        const textarea = wrapper.findTextarea()!;

        textarea?.setTextareaValue('New template');
        const saveButton = wrapper.findButton('[data-testid="save-prompt-btn"]')!;
        expect(saveButton).toBeDefined();
        saveButton!.click();

        const alertBar = wrapper.findAlert();
        expect(alertBar!.findContent().getElement().textContent).toContain('System prompt updated successfully');
    });

    it('resets template to default value when reset button is clicked', () => {
        const wrapper = renderSplitPanelSettings(DEFAULT_TEXT_CONFIG);
        const textarea = wrapper.findTextarea()!;

        textarea?.setTextareaValue('New template with {history} and {input}');

        // Click reset button
        const resetButton = wrapper.findButton('[data-testid="reset-prompt-btn"]')!;
        expect(resetButton).toBeDefined();
        resetButton!.click();

        const alertBar = wrapper.findAlert();
        expect(alertBar!.findContent().getElement().textContent).toContain('System prompt reset to default');

        expect(textarea.getTextareaValue()).toBe(
            DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams.PromptParams.PromptTemplate
        );
    });

    it('closes panel when cancel button is clicked', () => {
        const wrapper = renderSplitPanelSettings(DEFAULT_TEXT_CONFIG);
        const textarea = wrapper.findTextarea()!;

        // Make some changes to verify they don't get saved
        textarea?.setTextareaValue('New template with {history} and {input}');

        // Find and click cancel button
        const cancelButton = wrapper.findButton('[data-testid="cancel-prompt-btn"]')!;
        expect(cancelButton).toBeDefined();
        cancelButton!.click();

        expect(wrapper.findSplitPanel()).toBeNull();

        const reopenedWrapper = renderSplitPanelSettings(DEFAULT_TEXT_CONFIG);
        const reopenedTextarea = reopenedWrapper.findTextarea()!;
        expect(reopenedTextarea.getTextareaValue()).toBe(
            DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams.PromptParams.PromptTemplate
        );
    });
});
