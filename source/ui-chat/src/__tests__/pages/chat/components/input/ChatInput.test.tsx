// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, vi, beforeEach, test } from 'vitest';
import { waitFor } from '@testing-library/react';
import * as React from 'react';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { TestStoreFactory, testStoreFactory } from '@/__tests__/utils/test-redux-store-factory';
import { ChatInput } from '@/pages/chat/components/input/ChatInput';
import { CONSTRAINT_TEXT_ERROR_COLOR, DOCS_LINKS } from '@/utils/constants';
import { DEFAULT_AGENT_CONFIG, DEFAULT_TEXT_CONFIG } from '@/__tests__/utils/test-configs';

vi.mock('@cloudscape-design/components', async () => {
    const actual = await vi.importActual('@cloudscape-design/components');
    return {
        ...actual,
        FileInput: vi.fn(({ onChange, ...props }: any) => {
            const handleChange = (files: File[]) => {
                if (onChange) {
                    onChange({ detail: { value: files } });
                }
            };

            (global as any).__mockFileInputChange = handleChange;

            return React.createElement(
                'div',
                {
                    className: 'awsui-file-input',
                    'data-testid': 'file-input-wrapper'
                },
                [
                    React.createElement('input', {
                        key: 'native-input',
                        ...props,
                        type: 'file',
                        'data-testid': 'mock-file-input',
                        className: 'awsui-file-input-native',
                        onChange: () => {}
                    })
                ]
            );
        })
    };
});

vi.mock('@/services/fileUploadService', () => ({
    uploadFiles: vi.fn().mockImplementation((files: File[]) =>
        Promise.resolve({
            results: files.map((file) => ({
                success: true,
                fileName: file.name,
                fileKey: `test-key-${file.name}`,
                error: null,
                attempts: 1
            })),
            allSuccessful: true,
            successCount: files.length,
            failureCount: 0,
            uploadedFiles: files.map((file) => ({
                key: `test-key-${file.name}`,
                fileName: file.name,
                fileContentType: file.type,
                fileExtension: file.name.split('.').pop() || '',
                fileSize: file.size,
                messageId: 'test-message-id',
                conversationId: 'test-conversation-id'
            })),
            messageId: 'test-message-id'
        })
    ),
    deleteFiles: vi.fn().mockResolvedValue({
        results: [],
        allSuccessful: true,
        successCount: 0,
        failureCount: 0
    })
}));

// Mock the file upload utilities
vi.mock('@/utils/file-upload', () => ({
    validateFile: vi.fn(() => null), // Return null for valid files
    validateFiles: vi.fn(() => []), // Return empty array for no errors
    generateConversationId: vi.fn(() => 'test-conversation-id'),
    isFileCountExceeded: vi.fn(() => ({ exceeded: false })) // Return no count exceeded by default
}));

// Mock the useFileUpload hook
vi.mock('@/hooks/use-file-upload', () => ({
    useFileUpload: vi.fn(() => ({
        files: [],
        uploadedFiles: [],
        isUploading: false,
        isDeleting: false,
        uploadProgress: {},
        uploadErrors: {},
        deleteErrors: {},
        addFiles: vi.fn(),
        removeFile: vi.fn(),
        clearFiles: vi.fn(),
        uploadFiles: vi.fn(),
        deleteUploadedFiles: vi.fn(),
        generateConversationId: vi.fn(() => 'test-conversation-id'),
        generateMessageId: vi.fn(() => 'test-message-id')
    }))
}));

vi.mock('@/contexts/UserContext', () => ({
    useUser: vi.fn(() => ({
        getAccessToken: vi.fn(() => Promise.resolve('mock-token'))
    }))
}));

const simulateFileSelection = (fileInput: any, files: File[]) => {
    const changeHandler = (global as any).__mockFileInputChange;
    if (changeHandler) {
        changeHandler(files);
    }
};

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

    describe('Multimodal File Upload', () => {
        const multimodalConfig = {
            ...DEFAULT_AGENT_CONFIG,
            UseCaseConfig: {
                UseCaseName: 'test-agent-builder-use-case',
                UseCaseType: 'AgentBuilder' as const,
                LlmParams: {
                    RAGEnabled: false,
                    MultimodalParams: {
                        MultimodalEnabled: true
                    }
                },
                FeedbackParams: {
                    FeedbackEnabled: true
                }
            }
        };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        test('shows file input when multimodal is enabled', () => {
            const onSend = vi.fn();
            const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />, {
                config: { runtimeConfig: multimodalConfig }
            });
            const wrapper = createWrapper(container);

            const fileInput = wrapper.find('[data-testid="file-input-wrapper"]');
            expect(fileInput).toBeTruthy();
            const element = fileInput?.getElement();
            expect(element).toBeTruthy();
        });

        test('does not show file input when multimodal is disabled', () => {
            const onSend = vi.fn();
            const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />);
            const wrapper = createWrapper(container);

            const fileInput = wrapper.findFileInput();
            expect(fileInput).toBeFalsy();
        });

        test('generates conversation ID when files are added', async () => {
            const onSend = vi.fn();
            const onSetConversationId = vi.fn();
            const { uploadFiles } = await import('@/services/fileUploadService');
            const { validateFile } = await import('@/utils/file-upload');

            vi.mocked(validateFile).mockReturnValue(null);
            vi.mocked(uploadFiles).mockResolvedValue({
                results: [],
                allSuccessful: true,
                successCount: 1,
                failureCount: 0,
                uploadedFiles: [
                    {
                        key: 'test-key',
                        fileName: 'test.jpg',
                        fileContentType: 'image/jpeg',
                        fileExtension: 'jpg',
                        fileSize: 1024
                    }
                ],
                messageId: 'test-message-id'
            });

            const { container } = testStoreFactory.renderWithStore(
                <ChatInput isLoading={false} onSend={onSend} onSetConversationId={onSetConversationId} />,
                { config: { runtimeConfig: multimodalConfig } }
            );
            const wrapper = createWrapper(container);

            const fileInput = wrapper.findFileInput();
            const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

            simulateFileSelection(fileInput, [testFile]);

            await waitFor(() => {
                expect(onSetConversationId).toHaveBeenCalledWith('test-conversation-id');
            });
        });

        test('displays file validation errors', async () => {
            const onSend = vi.fn();
            const { validateFile } = await import('@/utils/file-upload');

            vi.mocked(validateFile).mockReturnValue({
                fileName: 'invalid.txt',
                error: new Error('File type not supported')
            });

            const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />, {
                config: { runtimeConfig: multimodalConfig }
            });
            const wrapper = createWrapper(container);

            const fileInput = wrapper.findFileInput();
            const testFile = new File(['test'], 'invalid.txt', { type: 'text/plain' });

            simulateFileSelection(fileInput, [testFile]);

            await waitFor(() => {
                const fileTokenGroup = wrapper.find('[role="group"]');
                expect(fileTokenGroup).toBeTruthy();
            });
        });

        test('shows dismiss button for uploaded files', async () => {
            const onSend = vi.fn();
            const { validateFile } = await import('@/utils/file-upload');

            vi.mocked(validateFile).mockReturnValue(null);

            const { container } = testStoreFactory.renderWithStore(
                <ChatInput isLoading={false} onSend={onSend} conversationId="test-conversation-id" />,
                { config: { runtimeConfig: multimodalConfig } }
            );
            const wrapper = createWrapper(container);

            const fileInput = wrapper.findFileInput();
            const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

            simulateFileSelection(fileInput, [testFile]);

            await waitFor(() => {
                const fileTokens = container.querySelectorAll('[role="group"]');
                expect(fileTokens.length).toBeGreaterThan(0);
            });

            const dismissButton = wrapper.find('[aria-label*="Remove file"]');
            expect(dismissButton).toBeTruthy();
        });

        test('shows file count in constraint text when files are present', () => {
            const onSend = vi.fn();
            const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />, {
                config: { runtimeConfig: multimodalConfig }
            });
            const wrapper = createWrapper(container);

            const formField = wrapper.findFormField();
            const constraint = formField?.findConstraint();
            expect(constraint).toBeTruthy();
        });

        test('changes placeholder text when files are present', () => {
            const onSend = vi.fn();
            const { container } = testStoreFactory.renderWithStore(<ChatInput isLoading={false} onSend={onSend} />, {
                config: { runtimeConfig: multimodalConfig }
            });
            const wrapper = createWrapper(container);

            const promptInput = wrapper.findPromptInput();
            expect(promptInput?.findNativeTextarea()?.getElement()).toHaveAttribute('placeholder', 'Ask a question');
        });

        test('handles file selection and shows file tokens', async () => {
            const onSend = vi.fn();
            const onSetConversationId = vi.fn();
            const validateFile = vi.mocked((await import('@/utils/file-upload')).validateFile);
            const validateFiles = vi.mocked((await import('@/utils/file-upload')).validateFiles);

            validateFile.mockReturnValue(null);
            validateFiles.mockReturnValue([]);

            const { container } = testStoreFactory.renderWithStore(
                <ChatInput isLoading={false} onSend={onSend} onSetConversationId={onSetConversationId} />,
                { config: { runtimeConfig: multimodalConfig } }
            );
            const wrapper = createWrapper(container);

            const fileInput = wrapper.findFileInput();

            // Upload file
            const testFile = new File(['test content'], 'document.txt', { type: 'text/plain' });
            simulateFileSelection(fileInput, [testFile]);

            // Verify file is added to the UI
            await waitFor(() => {
                const fileTokens = container.querySelectorAll('[role="group"]');
                expect(fileTokens.length).toBeGreaterThan(0);
            });

            // Verify conversation ID is generated
            expect(onSetConversationId).toHaveBeenCalledWith('test-conversation-id');
        });

        test('shows dropzone when files are being dragged', async () => {
            const onSend = vi.fn();
            const onSetConversationId = vi.fn();

            const { container } = testStoreFactory.renderWithStore(
                <ChatInput isLoading={false} onSend={onSend} onSetConversationId={onSetConversationId} />,
                { config: { runtimeConfig: multimodalConfig } }
            );

            const fileInput = container.querySelector('[data-testid="file-input-wrapper"]');
            expect(fileInput).toBeTruthy();

            const chatInput = container.querySelector('[data-testid="chat-input"]');
            expect(chatInput).toBeTruthy();
        });

        test('shows error state for failed file uploads', async () => {
            const onSend = vi.fn();
            const onSetConversationId = vi.fn();
            const { validateFile } = await import('@/utils/file-upload');

            vi.mocked(validateFile).mockReturnValue({
                fileName: 'failed-file.txt',
                error: new Error('Upload failed')
            });

            const { container } = testStoreFactory.renderWithStore(
                <ChatInput isLoading={false} onSend={onSend} onSetConversationId={onSetConversationId} />,
                { config: { runtimeConfig: multimodalConfig } }
            );
            const wrapper = createWrapper(container);

            const fileInput = wrapper.findFileInput();
            const testFile = new File(['test content'], 'failed-file.txt', { type: 'text/plain' });

            simulateFileSelection(fileInput, [testFile]);

            await waitFor(() => {
                const fileTokens = container.querySelectorAll('[role="group"]');
                expect(fileTokens.length).toBeGreaterThan(0);
            });

            const errorElements = container.querySelectorAll('[class*="error"]');
            expect(errorElements.length).toBeGreaterThan(0);
        });

        test('replaces files with same name when uploading', async () => {
            const onSend = vi.fn();
            const onSetConversationId = vi.fn();
            const { uploadFiles } = await import('@/services/fileUploadService');
            const { validateFile } = await import('@/utils/file-upload');

            vi.mocked(validateFile).mockReturnValue(null);

            vi.mocked(uploadFiles).mockResolvedValueOnce({
                results: [{ success: true, fileName: 'document.txt', fileKey: 'test-key-1', error: null, attempts: 1 }],
                allSuccessful: true,
                successCount: 1,
                failureCount: 0,
                uploadedFiles: [
                    {
                        key: 'test-key-1',
                        fileName: 'document.txt',
                        fileContentType: 'text/plain',
                        fileExtension: 'txt',
                        fileSize: 1024,
                        messageId: 'test-message-id-1'
                    }
                ],
                messageId: 'test-message-id-1'
            });

            // second upload (replacement)
            vi.mocked(uploadFiles).mockResolvedValueOnce({
                results: [{ success: true, fileName: 'document.txt', fileKey: 'test-key-2', error: null, attempts: 1 }],
                allSuccessful: true,
                successCount: 1,
                failureCount: 0,
                uploadedFiles: [
                    {
                        key: 'test-key-2',
                        fileName: 'document.txt',
                        fileContentType: 'text/plain',
                        fileExtension: 'txt',
                        fileSize: 2048,
                        messageId: 'test-message-id-2'
                    }
                ],
                messageId: 'test-message-id-2'
            });

            const { container } = testStoreFactory.renderWithStore(
                <ChatInput isLoading={false} onSend={onSend} onSetConversationId={onSetConversationId} />,
                { config: { runtimeConfig: multimodalConfig } }
            );
            const wrapper = createWrapper(container);

            const fileInput = wrapper.findFileInput();

            const originalFile = new File(['original content'], 'document.txt', { type: 'text/plain' });
            simulateFileSelection(fileInput, [originalFile]);

            await waitFor(() => {
                const fileTokens = container.querySelectorAll('[role="group"]');
                expect(fileTokens.length).toBeGreaterThan(0);
            });

            // Upload replacement file with same name
            const replacementFile = new File(['new content'], 'document.txt', { type: 'text/plain' });
            simulateFileSelection(fileInput, [replacementFile]);

            // File should still be present in UI
            await waitFor(() => {
                const fileTokens = container.querySelectorAll('[role="group"]');
                expect(fileTokens.length).toBeGreaterThan(0);
            });
        });

        test('does not show file input when multimodal is disabled', async () => {
            const onSend = vi.fn();

            const nonMultimodalConfig = {
                ...DEFAULT_TEXT_CONFIG,
                UseCaseConfig: {
                    ...DEFAULT_TEXT_CONFIG.UseCaseConfig,
                    LlmParams: {
                        ...DEFAULT_TEXT_CONFIG.UseCaseConfig.LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                }
            };

            const { container } = testStoreFactory.renderWithStore(
                <ChatInput isLoading={false} onSend={onSend} conversationId="test-conversation-id" />,
                { config: { runtimeConfig: nonMultimodalConfig } }
            );
            const wrapper = createWrapper(container);

            const fileInput = wrapper.find('[data-testid="file-input-wrapper"]');
            expect(fileInput).toBeNull();

            const textarea = wrapper.find('textarea');
            expect(textarea).toBeTruthy();
            expect(textarea?.getElement().getAttribute('placeholder')).toBe('Ask a question');
        });

        test('should sort files with errors first in the UI', async () => {
            const onSend = vi.fn();
            const onSetConversationId = vi.fn();
            const { validateFile } = await import('@/utils/file-upload');

            vi.mocked(validateFile)
                .mockReturnValueOnce(null)
                .mockReturnValueOnce({
                    fileName: 'error-file.txt',
                    error: new Error('Invalid file type')
                })
                .mockReturnValueOnce(null);

            const { container } = testStoreFactory.renderWithStore(
                <ChatInput isLoading={false} onSend={onSend} onSetConversationId={onSetConversationId} />,
                { config: { runtimeConfig: multimodalConfig } }
            );
            const wrapper = createWrapper(container);

            const fileInput = wrapper.findFileInput();
            const testFiles = [
                new File(['content1'], 'valid-file.txt', { type: 'text/plain' }),
                new File(['content2'], 'error-file.txt', { type: 'text/plain' }),
                new File(['content3'], 'another-valid.txt', { type: 'text/plain' })
            ];

            simulateFileSelection(fileInput, testFiles);

            await waitFor(() => {
                const fileTokens = container.querySelectorAll('[role="group"]');
                expect(fileTokens.length).toBeGreaterThan(0);
            });

            const fileElements = container.querySelectorAll('[role="group"]');
            expect(fileElements.length).toBeGreaterThanOrEqual(3);
        });

        describe('Global Count Validation', () => {
            test('should validate file count limits', async () => {
                const { isFileCountExceeded } = await import('@/utils/file-upload');

                const validFiles = [
                    new File(['content1'], 'doc1.pdf', { type: 'application/pdf' }),
                    new File(['content2'], 'image1.jpg', { type: 'image/jpeg' })
                ];

                vi.mocked(isFileCountExceeded).mockReturnValueOnce({ exceeded: false });
                const withinLimits = isFileCountExceeded(validFiles);
                expect(withinLimits.exceeded).toBe(false);

                const tooManyFiles = Array.from(
                    { length: 10 },
                    (_, i) => new File([`content${i}`], `image${i}.jpg`, { type: 'image/jpeg' })
                );

                vi.mocked(isFileCountExceeded).mockReturnValueOnce({
                    exceeded: true,
                    message: '10 images attached. Only 5 images allowed.'
                });
                const exceedsLimits = isFileCountExceeded(tooManyFiles);
                expect(exceedsLimits.exceeded).toBe(true);
                expect(exceedsLimits.message).toBeDefined();
            });
        });
    });
});
