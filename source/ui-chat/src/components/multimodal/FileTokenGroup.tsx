// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import FileTokenGroup from '@cloudscape-design/components/file-token-group';
import { FileTokenGroupProps } from '@cloudscape-design/components/file-token-group';
import { Box, SpaceBetween, Icon } from '@cloudscape-design/components';
import { UploadedFile } from '../../types/file-upload';

type FileWithLoading = File & { loading?: boolean };
type UploadedFileWithLoading = UploadedFile & { loading?: boolean };
type SupportedFile = File | UploadedFile | FileWithLoading | UploadedFileWithLoading;

interface FileTokenListProps {
    readonly files: SupportedFile[];
    readonly onDismiss?: (fileIndex: number) => void;
    readonly readOnly?: boolean;
    readonly alignment?: FileTokenGroupProps.Alignment;
    readonly showFileSize?: boolean;
    readonly uploadErrors?: Record<string, Error>;
    readonly deleteErrors?: Record<string, Error>;
    readonly limit?: number;
    readonly label?: string;
    readonly showLabel?: boolean;
}

const convertToFileObject = (file: SupportedFile): File => {
    if (file instanceof File) {
        return file;
    }

    const uploadedFile = file as UploadedFile;
    const fileObj = new File([''], uploadedFile.fileName, {
        type: uploadedFile.fileContentType,
        lastModified: Date.now()
    });

    if (uploadedFile.fileSize !== undefined) {
        Object.defineProperty(fileObj, 'size', {
            value: uploadedFile.fileSize,
            writable: false,
            enumerable: true,
            configurable: false
        });
    }

    return fileObj;
};

export const FileTokenList = ({
    files,
    onDismiss,
    readOnly = false,
    alignment = 'horizontal',
    showFileSize = true,
    uploadErrors = {},
    deleteErrors = {},
    limit = 5,
    label = 'Attached files',
    showLabel = false
}: FileTokenListProps) => {
    if (!files?.length) {
        return null;
    }

    const items = useMemo(() => {
        return files.map((file) => {
            const fileName = file instanceof File ? file.name : (file as UploadedFile).fileName;
            const fileObj = convertToFileObject(file);
            const hasUploadError = uploadErrors[fileName];
            const hasDeleteError = deleteErrors[fileName];

            const errorText = hasDeleteError?.message || hasUploadError?.message;

            return {
                file: fileObj,
                ...(errorText && { errorText }),
                ...(!readOnly && (file as FileWithLoading).loading === true && { loading: true })
            };
        });
    }, [files, uploadErrors, deleteErrors, readOnly]);

    const handleDismiss = ({ detail }: { detail: { fileIndex: number } }) => {
        if (onDismiss) {
            onDismiss(detail.fileIndex);
        }
    };

    const fileTokenGroup = (
        <FileTokenGroup
            items={items}
            alignment={alignment}
            showFileSize={showFileSize}
            readOnly={readOnly}
            limit={limit}
            onDismiss={handleDismiss}
            i18nStrings={{
                removeFileAriaLabel: (fileIndex: number) => `Remove file ${fileIndex + 1}`,
                limitShowFewer: 'Show fewer files',
                limitShowMore: 'Show more files',
                errorIconAriaLabel: 'Error',
                warningIconAriaLabel: 'Warning'
            }}
        />
    );

    if (showLabel) {
        const labelContent = (
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                <Icon name="file" size="small" />
                <Box fontSize="body-m" color="text-status-info">
                    {label}
                </Box>
            </SpaceBetween>
        );

        return (
            <SpaceBetween direction="vertical" size="xs">
                {labelContent}
                {fileTokenGroup}
            </SpaceBetween>
        );
    }

    return fileTokenGroup;
};
