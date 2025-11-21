// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { memo, useCallback, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
    Box,
    FileDropzone,
    FileInput,
    FormField,
    Icon,
    Link,
    PromptInput,
    SpaceBetween
} from '@cloudscape-design/components';
import { useFilesDragging } from '@cloudscape-design/components/file-dropzone';

import { getMultimodalEnabledState, getUseCaseId } from '../../../../store/configSlice';

import { FileTokenList } from '../../../../components/multimodal/FileTokenGroup';
import { useFileUpload } from '../../../../hooks/use-file-upload';
import { uploadFiles, deleteFiles } from '../../../../services/fileUploadService';
import { RootState } from '../../../../store/store';
import { getMaxInputTextLength } from '../../../../store/configSlice';
import { UploadedFile } from '../../../../types/file-upload';
import {
    CHAT_INPUT_MAX_ROWS,
    CONSTRAINT_TEXT_ERROR_COLOR,
    DEFAULT_CHAT_INPUT_MAX_LENGTH,
    DOCS_LINKS,
    MULTIMODAL_SUPPORTED_IMAGE_FORMATS,
    MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS
} from '../../../../utils/constants';
import { validateFile, isFileCountExceeded } from '../../../../utils/file-upload';
import { formatCharacterCount } from '../../../../utils/validation';

interface ChatInputProps {
    isLoading: boolean;
    onSend: (value: string) => void;
    onSendWithFiles?: (value: string, files: UploadedFile[], messageId?: string) => void;
    conversationId?: string;
    onSetConversationId?: (conversationId: string) => void;
}

const FilesDraggingProvider = ({ children }: { children: (areFilesDragging: boolean) => React.ReactNode }) => {
    const { areFilesDragging } = useFilesDragging();
    return <>{children(areFilesDragging)}</>;
};

export const ChatInput = memo<ChatInputProps>(
    ({
        isLoading,
        onSend,
        onSendWithFiles,
        conversationId,
        onSetConversationId
    }: ChatInputProps): React.ReactElement => {
        const [inputText, setInputText] = useState('');
        const [files, setFiles] = useState<File[]>([]);
        const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
        const [isUploading, setIsUploading] = useState(false);
        const [isDeleting, setIsDeleting] = useState(false);
        const [uploadErrors, setUploadErrors] = useState<Record<string, Error>>({});
        const [deleteErrors, setDeleteErrors] = useState<Record<string, Error>>({});
        const [messageId, setMessageId] = useState<string>('');
        const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

        const { generateConversationId, generateMessageId } = useFileUpload();
        // Selector to determine if user is internal
        const isInternalUser = useSelector((state: RootState) => state.config.runtimeConfig?.IsInternalUser) === 'true';

        const isMultimodalEnabled = useSelector((state: RootState) => getMultimodalEnabledState(state));
        const useCaseId = useSelector(getUseCaseId);

        const maxInputLength = useSelector((state: RootState) => {
            try {
                return getMaxInputTextLength(state);
            } catch {
                return DEFAULT_CHAT_INPUT_MAX_LENGTH;
            }
        });

        const clearObsoleteValidationErrors = useCallback((allFiles: File[]) => {
            // Only clear errors for files that no longer exist in the file list
            const existingFileNames = new Set(allFiles.map((file) => file.name));

            setUploadErrors((prev) => {
                const newErrors = { ...prev };
                Object.keys(newErrors).forEach((fileName) => {
                    // Clear errors for files that have been completely removed
                    if (!existingFileNames.has(fileName)) {
                        delete newErrors[fileName];
                    }
                });

                return newErrors;
            });
        }, []);

        const createFileFromUploaded = useCallback((uf: UploadedFile) => {
            const file = new File([], uf.fileName, { type: uf.fileContentType });
            Object.defineProperty(file, 'size', { value: uf.fileSize, writable: false });
            return file;
        }, []);

        const handleFileUpload = useCallback(
            async (filesToUpload: File[]) => {
                let currentConversationId = conversationId;

                // Generate conversation ID if we don't have one and we have files to upload
                if (!currentConversationId && isMultimodalEnabled && filesToUpload.length > 0) {
                    currentConversationId = generateConversationId();
                    if (onSetConversationId) {
                        onSetConversationId(currentConversationId);
                    }
                }

                if (!currentConversationId || !useCaseId) {
                    return;
                }

                setIsUploading(true);

                setUploadingFiles((prev) => {
                    const newSet = new Set(prev);
                    filesToUpload.forEach((file) => newSet.add(file.name));
                    return newSet;
                });

                setUploadErrors((prev) => {
                    const newErrors = { ...prev };
                    filesToUpload.forEach((file) => delete newErrors[file.name]);
                    return newErrors;
                });

                try {
                    // Use existing messageId or generate a new one for this conversation
                    let currentMessageId = messageId;
                    if (!currentMessageId) {
                        currentMessageId = generateMessageId();
                        setMessageId(currentMessageId);
                    }

                    const result = await uploadFiles(
                        filesToUpload,
                        currentConversationId,
                        useCaseId,
                        undefined, // onProgress
                        (fileName: string, success: boolean, error?: Error) => {
                            if (!success && error) {
                                setUploadErrors((prev) => ({ ...prev, [fileName]: error }));
                            }
                        },
                        3, // maxRetries
                        currentMessageId
                    );

                    if (result.uploadedFiles.length > 0) {
                        setUploadedFiles((prev) => {
                            const newUploadedFiles = [...prev];
                            result.uploadedFiles.forEach((newFile) => {
                                const existingIndex = newUploadedFiles.findIndex(
                                    (existing) => existing.fileName === newFile.fileName
                                );
                                if (existingIndex !== -1) {
                                    newUploadedFiles[existingIndex] = newFile;
                                } else {
                                    newUploadedFiles.push(newFile);
                                }
                            });
                            return newUploadedFiles;
                        });
                    }

                    setFiles((prev) =>
                        prev.filter((file) => {
                            const wasUploaded = result.uploadedFiles.some(
                                (uploaded) => uploaded.fileName === file.name
                            );
                            // Keep files that have validation errors
                            const hasValidationError = uploadErrors[file.name];
                            return !wasUploaded || hasValidationError;
                        })
                    );

                    const failedResults = result.results.filter((r) => !r.success);
                    if (failedResults.length > 0) {
                        setUploadErrors((prev) => {
                            const newErrors = { ...prev };
                            failedResults.forEach((fileResult) => {
                                if (fileResult.error) {
                                    newErrors[fileResult.fileName] = fileResult.error;
                                }
                            });
                            return newErrors;
                        });
                    }
                } catch (error) {
                    filesToUpload.forEach((file) => {
                        setUploadErrors((prev) => ({
                            ...prev,
                            [file.name]: new Error('Upload failed')
                        }));
                    });
                } finally {
                    setIsUploading(false);
                    setUploadingFiles((prev) => {
                        const newSet = new Set(prev);
                        filesToUpload.forEach((file) => newSet.delete(file.name));
                        return newSet;
                    });
                }
            },
            [
                conversationId,
                useCaseId,
                isMultimodalEnabled,
                generateConversationId,
                generateMessageId,
                messageId,
                onSetConversationId
            ]
        );

        const handleAddFiles = useCallback(
            async (newFiles: File[]) => {
                if (!newFiles || !Array.isArray(newFiles)) {
                    return;
                }

                const deduplicatedNewFiles = new Map<string, File>();
                newFiles.forEach((file) => deduplicatedNewFiles.set(file.name, file));
                const uniqueFiles = Array.from(deduplicatedNewFiles.values());

                const validFiles: File[] = [];
                const invalidFiles: File[] = [];
                const errors: Record<string, Error> = {};

                // validate individual files
                uniqueFiles.forEach((file) => {
                    const fileError = validateFile(file);
                    if (fileError) {
                        errors[file.name] = fileError.error;
                        invalidFiles.push(file);
                    } else {
                        validFiles.push(file);
                    }
                });

                if (validFiles.length > 0 || invalidFiles.length > 0) {
                    const updatedFiles = [...files];
                    const updatedUploadedFiles = [...uploadedFiles];
                    const filesToUpload: File[] = [];

                    const filesToDelete: string[] = [];

                    const allNewFiles = [...validFiles, ...invalidFiles];

                    allNewFiles.forEach((newFile) => {
                        // Check if file exists in pending uploads
                        const existingFileIndex = updatedFiles.findIndex((file) => file.name === newFile.name);
                        if (existingFileIndex !== -1) {
                            updatedFiles[existingFileIndex] = newFile;
                        } else {
                            updatedFiles.push(newFile);
                        }

                        // Check if file exists in uploaded files - if so, mark for deletion
                        const existingUploadedIndex = updatedUploadedFiles.findIndex(
                            (file) => file.fileName === newFile.name
                        );
                        if (existingUploadedIndex !== -1) {
                            const fileToDelete = updatedUploadedFiles[existingUploadedIndex];
                            if (fileToDelete.messageId) {
                                filesToDelete.push(fileToDelete.fileName);
                                // Remove from uploaded files array
                                updatedUploadedFiles.splice(existingUploadedIndex, 1);
                            }
                        }

                        if (validFiles.includes(newFile)) {
                            filesToUpload.push(newFile);
                        }
                    });

                    const existingFiles = [...updatedFiles, ...updatedUploadedFiles.map(createFileFromUploaded)];

                    setFiles(updatedFiles);
                    setUploadedFiles(updatedUploadedFiles);                   
                    setUploadErrors((prev) => ({ ...prev, ...errors }));

                    // Proceed with upload if there are valid files to upload
                    if (isMultimodalEnabled && filesToUpload.length > 0) {
                        // Generate conversationId if we don't have one yet
                        if (!conversationId && onSetConversationId) {
                            const newConversationId = generateConversationId();
                            onSetConversationId(newConversationId);
                        }
                        // Delete existing uploaded files with same names first
                        if (filesToDelete.length > 0 && conversationId && messageId && useCaseId) {
                            try {
                                const deleteResult = await deleteFiles(
                                    filesToDelete,
                                    conversationId,
                                    messageId,
                                    useCaseId,
                                    (fileName: string, success: boolean, error?: Error) => {
                                        if (!success && error) {
                                            console.warn(`Failed to delete existing file ${fileName}:`, error);
                                            setDeleteErrors((prev) => ({ ...prev, [fileName]: error }));
                                        }
                                    },
                                    3 // maxRetries for delete operation
                                );

                                if (deleteResult.allSuccessful) {
                                    handleFileUpload(filesToUpload);
                                } else {
                                    console.warn('Some file deletions failed, proceeding with upload anyway');
                                    handleFileUpload(filesToUpload);
                                }
                            } catch (error) {
                                console.error('Error during file deletion:', error);
                                filesToDelete.forEach((fileName) => {
                                    setDeleteErrors((prev) => ({
                                        ...prev,
                                        [fileName]: new Error('Delete operation failed')
                                    }));
                                });
                                handleFileUpload(filesToUpload);
                            }
                        } else {
                            handleFileUpload(filesToUpload);
                        }
                    }
                }

                if (Object.keys(errors).length > 0) {
                    setUploadErrors((prev) => ({ ...prev, ...errors }));
                }
            },
            [
                files,
                uploadedFiles,
                isMultimodalEnabled,
                handleFileUpload,
                conversationId,
                onSetConversationId,
                createFileFromUploaded,
                messageId,
                useCaseId,
                generateConversationId
            ]
        );

        // Sort by error files first, then normal files
        const orderedFiles = useMemo(() => {
            const allFiles = [
                ...files.map((file, originalIndex) => ({
                    file,
                    originalIndex,
                    isUploaded: false,
                    fileName: file.name
                })),
                ...uploadedFiles.map((file, originalIndex) => ({
                    file,
                    originalIndex,
                    isUploaded: true,
                    fileName: file.fileName
                }))
            ];

            // Separate files with errors from files without errors
            const filesWithErrors = allFiles.filter(
                (item) => uploadErrors[item.fileName] || deleteErrors[item.fileName]
            );
            const filesWithoutErrors = allFiles.filter(
                (item) => !uploadErrors[item.fileName] && !deleteErrors[item.fileName]
            );

            return [...filesWithErrors, ...filesWithoutErrors];
        }, [files, uploadedFiles, uploadErrors, deleteErrors]);

        const handleFileDismiss = useCallback(
            async (fileIndex: number) => {
                const itemToRemove = orderedFiles[fileIndex];
                if (!itemToRemove) return;

                const fileName = itemToRemove.fileName;

                if (!itemToRemove.isUploaded) {
                    const updatedFiles = files.filter((_, index) => index !== itemToRemove.originalIndex);
                    setFiles(updatedFiles);

                    setUploadErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[fileName];
                        return newErrors;
                    });
                    setDeleteErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[fileName];
                        return newErrors;
                    });

                    const allFiles = [...updatedFiles, ...uploadedFiles.map(createFileFromUploaded)];
                    clearObsoleteValidationErrors(allFiles);
                } else {
                    // Remove from uploaded files - call delete API with retry logic
                    const fileToDelete = uploadedFiles[itemToRemove.originalIndex];

                    if (fileToDelete && conversationId && fileToDelete.messageId && useCaseId) {
                        setIsDeleting(true);

                        setDeleteErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors[fileToDelete.fileName];
                            return newErrors;
                        });

                        try {
                            const fileMessageId = fileToDelete.messageId!;
                            const result = await deleteFiles(
                                [fileToDelete.fileName],
                                fileToDelete.conversationId || conversationId,
                                fileMessageId,
                                useCaseId,
                                (fileName: string, success: boolean, error?: Error) => {
                                    if (!success && error) {
                                        setDeleteErrors((prev) => ({ ...prev, [fileName]: error }));
                                    }
                                }
                            );

                            if (result.allSuccessful) {
                                const updatedUploadedFiles = uploadedFiles.filter(
                                    (_, index) => index !== itemToRemove.originalIndex
                                );
                                setUploadedFiles(updatedUploadedFiles);

                                const allFiles = [...files, ...updatedUploadedFiles.map(createFileFromUploaded)];
                                clearObsoleteValidationErrors(allFiles);
                            }
                        } catch (error) {
                            console.error('Failed to delete file:', error);
                            setDeleteErrors((prev) => ({
                                ...prev,
                                [fileToDelete.fileName]: new Error('Delete failed')
                            }));
                        } finally {
                            setIsDeleting(false);
                        }
                    } else {
                        // Fallback: just remove from UI if we don't have required info
                        const updatedUploadedFiles = uploadedFiles.filter(
                            (_, index) => index !== itemToRemove.originalIndex
                        );
                        setUploadedFiles(updatedUploadedFiles);

                        const allFiles = [...files, ...updatedUploadedFiles.map(createFileFromUploaded)];
                        clearObsoleteValidationErrors(allFiles);
                    }
                }
            },
            [
                orderedFiles,
                files,
                uploadedFiles,
                conversationId,
                messageId,
                useCaseId,
                clearObsoleteValidationErrors,
                createFileFromUploaded
            ]
        );

        const characterCount = inputText.length;
        const isOverLimit = characterCount > maxInputLength;
        const hasFiles = files.length > 0 || uploadedFiles.length > 0;
        const totalFiles = files.length + uploadedFiles.length;
        const hasFileErrors = Object.keys(uploadErrors).length > 0 || Object.keys(deleteErrors).length > 0;
        const allFiles = [...files, ...uploadedFiles.map(createFileFromUploaded)];
        const fileCountCheck = isFileCountExceeded(allFiles);
        const hasCountError = fileCountCheck.exceeded;

        const handleAction = useCallback(
            ({ detail }: { detail: { value: string } }) => {
                if (!detail.value?.trim() || isLoading || isUploading || isDeleting) return;

                if (hasFileErrors || hasCountError) {
                    return;
                }

                if (detail.value.length <= maxInputLength) {
                    if (isMultimodalEnabled && uploadedFiles.length > 0 && onSendWithFiles) {
                        onSendWithFiles(detail.value, uploadedFiles, messageId);
                    } else {
                        onSend(detail.value);
                    }
                    setInputText('');

                    // Reset messageId for next message
                    setMessageId('');

                    if (isMultimodalEnabled) {
                        setUploadedFiles([]);
                        setFiles([]);
                        setUploadErrors({});
                        setDeleteErrors({});
                    }
                }
            },
            [
                isLoading,
                isUploading,
                isDeleting,
                onSend,
                onSendWithFiles,
                maxInputLength,
                uploadedFiles,
                isMultimodalEnabled,
                hasFileErrors,
                hasCountError
            ]
        );
        const acceptedFormats = [...MULTIMODAL_SUPPORTED_IMAGE_FORMATS, ...MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS]
            .map((format) => `.${format}`)
            .join(',');

        return (
            <FormField
                stretch
                constraintText={
                    <>
                        <span
                            style={
                                { color: isOverLimit ? CONSTRAINT_TEXT_ERROR_COLOR : 'inherit' } as React.CSSProperties
                            }
                        >
                            {characterCount}/{formatCharacterCount(maxInputLength)} characters.{' '}
                        </span>
                        {hasCountError && (
                            <span style={{ color: CONSTRAINT_TEXT_ERROR_COLOR }}>{fileCountCheck.message} </span>
                        )}
                        {isMultimodalEnabled && hasFiles && (
                            <span>
                                {uploadedFiles.length > 0 &&
                                    `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''} uploaded.`}{' '}
                                {isUploading && 'Uploading...'} {isDeleting && 'Deleting...'}{' '}
                            </span>
                        )}
                        {isMultimodalEnabled && <span>Only supports up to 20 images and 5 documents per conversation. See help panel for supported file types. </span>}
                        {isInternalUser && (
                            <>
                                Use of this service is subject to the{' '}
                                {
                                    (
                                        <Link
                                            href={DOCS_LINKS.GEN_AI_POLICY}
                                            external
                                            variant="primary"
                                            fontSize="inherit"
                                        >
                                            Third Party Generative AI Use Policy
                                        </Link>
                                    ) as React.ReactElement
                                }
                                .
                            </>
                        )}
                    </>
                }
            >
                <FilesDraggingProvider>
                    {(areFilesDragging: boolean) => (
                        <PromptInput
                            onChange={({ detail }: { detail: { value: string } }) => setInputText(detail.value)}
                            onAction={handleAction}
                            value={inputText}
                            actionButtonAriaLabel={
                                isLoading || isUploading || isDeleting
                                    ? 'Send message button - suppressed'
                                    : isOverLimit
                                      ? 'Cannot send - message too long'
                                      : hasFileErrors
                                        ? 'Cannot send - file errors present'
                                        : isMultimodalEnabled && hasFiles
                                          ? `Send message with ${totalFiles} file${totalFiles !== 1 ? 's' : ''}`
                                          : 'Send message'
                            }
                            actionButtonIconName="send"
                            ariaLabel={
                                isLoading || isUploading || isDeleting
                                    ? 'Chat input text - suppressed'
                                    : 'Chat input text'
                            }
                            placeholder={
                                isMultimodalEnabled && hasFiles ? 'Ask a question about your files' : 'Ask a question'
                            }
                            autoFocus
                            maxRows={CHAT_INPUT_MAX_ROWS}
                            data-testid="chat-input"
                            disableSecondaryActionsPaddings
                            secondaryActions={
                                isMultimodalEnabled ? (
                                    <Box padding={{ left: 'xxs', top: 'xs' }}>
                                        <FileInput
                                            multiple={true}
                                            value={[]}
                                            onChange={({ detail }: { detail: { value: File[] } }) =>
                                                handleAddFiles(detail.value)
                                            }
                                            accept={acceptedFormats}
                                            ariaLabel="Upload files"
                                            variant="icon"
                                        />
                                    </Box>
                                ) : undefined
                            }
                            secondaryContent={
                                isMultimodalEnabled ? (
                                    areFilesDragging ? (
                                        <FileDropzone
                                            onChange={({ detail }: { detail: { value: File[] } }) =>
                                                handleAddFiles(detail.value)
                                            }
                                        >
                                            <SpaceBetween size="xs" alignItems="center">
                                                <Icon name="upload" />
                                                <Box>Drop files here</Box>
                                            </SpaceBetween>
                                        </FileDropzone>
                                    ) : (
                                        (files.length > 0 || uploadedFiles.length > 0) && (
                                            <FileTokenList
                                                files={orderedFiles.map((item) => {
                                                    if (!item.isUploaded) {
                                                        const fileWithLoading = item.file as File & {
                                                            loading?: boolean;
                                                        };
                                                        const hasError =
                                                            uploadErrors[item.fileName] || deleteErrors[item.fileName];
                                                        if (uploadingFiles.has(item.fileName) && !hasError) {
                                                            fileWithLoading.loading = true;
                                                        } else {
                                                            delete fileWithLoading.loading;
                                                        }
                                                        return fileWithLoading;
                                                    }
                                                    return item.file;
                                                })}
                                                onDismiss={handleFileDismiss}
                                                uploadErrors={uploadErrors}
                                                deleteErrors={deleteErrors}
                                            />
                                        )
                                    )
                                ) : undefined
                            }
                        />
                    )}
                </FilesDraggingProvider>
            </FormField>
        );
    }
);
export default ChatInput;
