// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export interface UploadedFile {
    key: string;
    fileName: string;
    fileContentType: string;
    fileExtension: string;
    fileSize?: number;
    messageId?: string;
    conversationId?: string;
}

export interface ApiFileReference {
    fileReference: string;
    fileName: string;
}

export interface FileUploadRequest {
    fileNames: string[];
    conversationId: string;
    messageId: string;
}

export interface FileUploadResponse {
    uploads: Array<{
        uploadUrl: string;
        formFields: Record<string, string>;
        fileName: string;
        fileKey: string;
        expiresIn: string;
        createdAt: string;
    }>;
}

export interface FileDeleteRequest {
    fileNames: string[];
    conversationId: string;
    messageId: string;
}

export interface FileDeleteResponse {
    deletions: Array<{
        success: boolean;
        fileName: string;
        error?: string;
    }>;
    allSuccessful: boolean;
    failureCount: number;
}

export interface FileUploadState {
    files: File[];
    uploadedFiles: UploadedFile[];
    isUploading: boolean;
    isDeleting: boolean;
    uploadProgress: Record<string, number>;
    uploadErrors: Record<string, Error>;
    deleteErrors: Record<string, Error>;
}

export interface FileValidationError {
    fileName: string;
    error: Error;
}

export type FileUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

export interface FileUploadItem {
    file: File;
    status: FileUploadStatus;
    progress: number;
    error?: Error;
    uploadedFile?: UploadedFile;
}

export const FileUploadActionTypes = {
    ADD_FILES: 'ADD_FILES',
    UPDATE_FILE_STATUS: 'UPDATE_FILE_STATUS',
    UPDATE_FILE_PROGRESS: 'UPDATE_FILE_PROGRESS',
    SET_FILE_ERROR: 'SET_FILE_ERROR',
    SET_DELETE_ERROR: 'SET_DELETE_ERROR',
    CLEAR_DELETE_ERROR: 'CLEAR_DELETE_ERROR',
    REMOVE_FILE: 'REMOVE_FILE',
    CLEAR_FILES: 'CLEAR_FILES',
    SET_UPLOADED_FILE: 'SET_UPLOADED_FILE',
    SET_UPLOADING: 'SET_UPLOADING',
    SET_DELETING: 'SET_DELETING'
} as const;

export type FileUploadActionType = (typeof FileUploadActionTypes)[keyof typeof FileUploadActionTypes];
