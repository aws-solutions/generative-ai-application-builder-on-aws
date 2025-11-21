// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useReducer } from 'react';
import { FileUploadState, UploadedFile, FileUploadActionType, FileUploadActionTypes } from '../types/file-upload';
import { validateFiles, isValidFileName } from '../utils/file-upload';
import { v4 as uuidv4 } from 'uuid';
import { uploadFiles as serviceUploadFiles, deleteFiles } from '../services/fileUploadService';

interface FileUploadAction {
    type: FileUploadActionType;
    payload?: any;
}

const initialState: FileUploadState = {
    files: [],
    uploadedFiles: [],
    isUploading: false,
    isDeleting: false,
    uploadProgress: {},
    uploadErrors: {},
    deleteErrors: {}
};

const fileUploadReducer = (state: FileUploadState, action: FileUploadAction): FileUploadState => {
    switch (action.type) {
        case FileUploadActionTypes.ADD_FILES:
            return {
                ...state,
                files: [...state.files, ...action.payload]
            };
        case FileUploadActionTypes.UPDATE_FILE_PROGRESS:
            return {
                ...state,
                uploadProgress: {
                    ...state.uploadProgress,
                    [action.payload.fileName]: action.payload.progress
                }
            };
        case FileUploadActionTypes.SET_FILE_ERROR:
            return {
                ...state,
                uploadErrors: {
                    ...state.uploadErrors,
                    [action.payload.fileName]: action.payload.error
                }
            };
        case FileUploadActionTypes.SET_DELETE_ERROR:
            return {
                ...state,
                deleteErrors: {
                    ...state.deleteErrors,
                    [action.payload.fileName]: action.payload.error
                }
            };
        case FileUploadActionTypes.CLEAR_DELETE_ERROR:
            return {
                ...state,
                deleteErrors: Object.fromEntries(
                    Object.entries(state.deleteErrors).filter(([key]) => key !== action.payload)
                )
            };
        case FileUploadActionTypes.REMOVE_FILE:
            return {
                ...state,
                files: state.files.filter((file: File) => file.name !== action.payload),
                uploadedFiles: state.uploadedFiles.filter((file: UploadedFile) => file.fileName !== action.payload),
                uploadProgress: Object.fromEntries(
                    Object.entries(state.uploadProgress).filter(([key]) => key !== action.payload)
                ),
                uploadErrors: Object.fromEntries(
                    Object.entries(state.uploadErrors).filter(([key]) => key !== action.payload)
                ),
                deleteErrors: Object.fromEntries(
                    Object.entries(state.deleteErrors).filter(([key]) => key !== action.payload)
                )
            };
        case FileUploadActionTypes.CLEAR_FILES:
            return initialState;
        case FileUploadActionTypes.SET_UPLOADED_FILE:
            return {
                ...state,
                uploadedFiles: [...state.uploadedFiles, action.payload]
            };
        case FileUploadActionTypes.SET_UPLOADING:
            return {
                ...state,
                isUploading: action.payload
            };
        case FileUploadActionTypes.SET_DELETING:
            return {
                ...state,
                isDeleting: action.payload
            };
        default:
            return state;
    }
};

export const useFileUpload = () => {
    const [state, dispatch] = useReducer(fileUploadReducer, initialState);
    const addFiles = useCallback(async (newFiles: File[]) => {
        const validationErrors = validateFiles(newFiles);

        if (validationErrors.length > 0) {
            validationErrors.forEach((error) => {
                dispatch({
                    type: FileUploadActionTypes.SET_FILE_ERROR,
                    payload: { fileName: error.fileName, error: error.error }
                });
            });
            return;
        }

        const validFiles: File[] = newFiles;

        if (validFiles.length > 0) {
            dispatch({ type: FileUploadActionTypes.ADD_FILES, payload: validFiles });
        }
    }, []);

    const removeFile = useCallback((fileName: string) => {
        if (!isValidFileName(fileName)) {
            console.error('Invalid fileName provided to removeFile:', fileName);
            return;
        }

        dispatch({ type: FileUploadActionTypes.REMOVE_FILE, payload: fileName });
    }, []);

    const clearFiles = useCallback(() => {
        dispatch({ type: FileUploadActionTypes.CLEAR_FILES });
    }, []);

    const uploadFiles = useCallback(
        async (conversationId: string, useCaseId: string, authToken: string): Promise<UploadedFile[]> => {
            if (state.files.length === 0) return [];

            dispatch({ type: FileUploadActionTypes.SET_UPLOADING, payload: true });

            try {
                const result = await serviceUploadFiles(
                    state.files,
                    conversationId,
                    useCaseId,
                    (fileName: string, progress: number) => {
                        dispatch({
                            type: FileUploadActionTypes.UPDATE_FILE_PROGRESS,
                            payload: { fileName, progress }
                        });
                    },
                    (fileName: string, success: boolean, error?: Error) => {
                        if (!success && error && isValidFileName(fileName)) {
                            dispatch({
                                type: 'SET_FILE_ERROR',
                                payload: { fileName, error }
                            });
                        }
                    }
                );
                result.uploadedFiles.forEach((uploadedFile: UploadedFile) => {
                    dispatch({ type: FileUploadActionTypes.SET_UPLOADED_FILE, payload: uploadedFile });
                });

                return result.uploadedFiles;
            } finally {
                dispatch({ type: FileUploadActionTypes.SET_UPLOADING, payload: false });
            }
        },
        [state.files]
    );

    const deleteUploadedFiles = useCallback(
        async (fileNames: string[], conversationId: string, messageId: string, useCaseId: string) => {
            if (fileNames.length === 0) return { results: [], allSuccessful: true, successCount: 0, failureCount: 0 };

            const validFileNames = fileNames.filter((fileName) => {
                if (!isValidFileName(fileName)) {
                    console.error('Invalid fileName provided to deleteUploadedFiles:', fileName);
                    return false;
                }
                return true;
            });

            if (validFileNames.length === 0) {
                console.error('No valid fileNames provided to deleteUploadedFiles');
                return { results: [], allSuccessful: false, successCount: 0, failureCount: fileNames.length };
            }

            dispatch({ type: FileUploadActionTypes.SET_DELETING, payload: true });

            validFileNames.forEach((fileName) => {
                dispatch({ type: FileUploadActionTypes.CLEAR_DELETE_ERROR, payload: fileName });
            });

            try {
                const result = await deleteFiles(
                    validFileNames,
                    conversationId,
                    messageId,
                    useCaseId,
                    (fileName: string, success: boolean, error?: Error) => {
                        if (!success && error && isValidFileName(fileName)) {
                            dispatch({
                                type: FileUploadActionTypes.SET_DELETE_ERROR,
                                payload: { fileName, error }
                            });
                        }
                    }
                );

                result.deletions.forEach((deletion) => {
                    if (deletion.success && isValidFileName(deletion.fileName)) {
                        dispatch({ type: FileUploadActionTypes.REMOVE_FILE, payload: deletion.fileName });
                    }
                });

                return result;
            } catch (error) {
                // Set error for all valid files if the request fails completely
                validFileNames.forEach((fileName) => {
                    dispatch({
                        type: FileUploadActionTypes.SET_DELETE_ERROR,
                        payload: {
                            fileName,
                            error: error instanceof Error ? error.message : 'Delete failed'
                        }
                    });
                });
                throw error;
            } finally {
                dispatch({ type: FileUploadActionTypes.SET_DELETING, payload: false });
            }
        },
        []
    );

    const generateConversationId = useCallback((): string => {
        return uuidv4();
    }, []);

    const generateMessageId = useCallback((): string => {
        return uuidv4();
    }, []);

    return {
        files: state.files,
        uploadedFiles: state.uploadedFiles,
        isUploading: state.isUploading,
        isDeleting: state.isDeleting,
        uploadProgress: state.uploadProgress,
        uploadErrors: state.uploadErrors,
        deleteErrors: state.deleteErrors,
        addFiles,
        removeFile,
        clearFiles,
        uploadFiles,
        deleteUploadedFiles,
        generateConversationId,
        generateMessageId
    };
};
