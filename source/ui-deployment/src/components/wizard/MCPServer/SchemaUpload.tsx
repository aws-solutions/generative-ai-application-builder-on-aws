// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FormField, FileUpload } from '@cloudscape-design/components';
import {
    GATEWAY_TARGET_TYPES,
    MCP_TARGET_TYPE_OPTIONS,
    MCP_SCHEMA_FILE_MIN_SIZE,
    MCP_SCHEMA_FILE_MAX_SIZE,
    MCP_SCHEMA_FILE_NAME_MIN_LENGTH,
    MCP_SCHEMA_FILE_NAME_MAX_LENGTH
} from '@/utils/constants';

interface SchemaUploadProps {
    targetType: GATEWAY_TARGET_TYPES;
    uploadedSchema: File | null;
    onSchemaChange: (file: File | null) => void;
    targetIndex: number;
    errorText?: string;
}

export const SchemaUpload = ({
    targetType,
    uploadedSchema,
    onSchemaChange,
    targetIndex,
    errorText
}: SchemaUploadProps) => {
    const [validationError, setValidationError] = React.useState<string>('');
    const getSchemaDescription = () => {
        const targetLabel = MCP_TARGET_TYPE_OPTIONS.get(targetType)?.label;

        switch (targetType) {
            case GATEWAY_TARGET_TYPES.LAMBDA:
                return `Upload your ${targetLabel} schema file. Lambda function schema (JSON format).`;
            case GATEWAY_TARGET_TYPES.OPEN_API:
                return `Upload your ${targetLabel} schema file. OpenAPI specification (JSON or YAML format).`;
            case GATEWAY_TARGET_TYPES.SMITHY:
                return `Upload your ${targetLabel} schema file. Smithy model definition (.smithy or JSON format).`;
            default:
                return `Upload your ${targetLabel} schema file.`;
        }
    };

    const getAcceptedFileTypes = () => {
        switch (targetType) {
            case GATEWAY_TARGET_TYPES.LAMBDA:
                return ['.json'];
            case GATEWAY_TARGET_TYPES.OPEN_API:
                return ['.json', '.yaml', '.yml'];
            case GATEWAY_TARGET_TYPES.SMITHY:
                return ['.smithy', '.json'];
            default:
                return ['.json'];
        }
    };

    const validateFileName = (fileName: string): string | null => {
        if (!fileName || fileName.trim() === '') {
            return 'Filename cannot be empty or contain only whitespace.';
        }

        // Check if filename has a valid extension
        const fileExtension = fileName.toLowerCase().match(/\.[^.]+$/)?.[0];
        if (!fileExtension) {
            return 'Filename must have a valid file extension.';
        }

        // Validate filename pattern (must have content before extension)
        const filenameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
        if (!filenameWithoutExtension || filenameWithoutExtension.trim() === '') {
            return 'Filename must have content before the file extension.';
        }

        return null;
    };

    const validateFileUpload = (file: File): string | null => {
        // Validate filename pattern and structure
        const filenameError = validateFileName(file.name);
        if (filenameError) {
            return filenameError;
        }

        // Validate filename length
        if (file.name.length < MCP_SCHEMA_FILE_NAME_MIN_LENGTH) {
            return 'Selected file has no filename. Please choose a file with a valid name.';
        }
        if (file.name.length > MCP_SCHEMA_FILE_NAME_MAX_LENGTH) {
            return `Filename exceeds maximum length of ${MCP_SCHEMA_FILE_NAME_MAX_LENGTH} characters. Current filename is ${file.name.length} characters.`;
        }

        // Validate file extension compatibility with target type
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        const isValidExtension = getAcceptedFileTypes().some((ext) => ext.toLowerCase() === fileExtension);

        if (!isValidExtension) {
            return 'Invalid file type.';
        }

        // Validate file size
        if (file.size < MCP_SCHEMA_FILE_MIN_SIZE) {
            return 'Selected file is empty. Please choose a file with content.';
        }
        if (file.size > MCP_SCHEMA_FILE_MAX_SIZE) {
            const maxSizeMB = (MCP_SCHEMA_FILE_MAX_SIZE / (1024 * 1024)).toFixed(1);
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
            return `File size exceeds the maximum limit of ${maxSizeMB} MB. Selected file is ${fileSizeMB} MB.`;
        }

        return null;
    };

    return (
        <FormField
            label="Schema File"
            description={getSchemaDescription()}
            errorText={validationError || errorText}
            data-testid={`file-upload-field-${targetIndex + 1}`}
        >
            <FileUpload
                onChange={({ detail }) => {
                    const file = detail.value[0] || null;

                    if (file) {
                        const validationError = validateFileUpload(file);
                        setValidationError(validationError || '');
                        if (validationError) {
                            return;
                        }
                    } else {
                        setValidationError('');
                    }
                    onSchemaChange(file);
                }}
                value={uploadedSchema ? [uploadedSchema] : []}
                i18nStrings={{
                    uploadButtonText: e => e ? 'Choose files' : 'Choose file',
                    dropzoneText: e => e ? 'Drop files to upload' : 'Drop file to upload',
                    removeFileAriaLabel: e => `Remove file ${e + 1}`,
                    limitShowFewer: 'Show fewer files',
                    limitShowMore: 'Show more files',
                    errorIconAriaLabel: 'Error'
                }}
                showFileLastModified
                showFileSize
                showFileThumbnail
                constraintText={`Accepted file types: ${getAcceptedFileTypes().join(', ')}`}
                accept={getAcceptedFileTypes().join(',')}
                data-testid={`file-upload-${targetIndex + 1}`}
            />
        </FormField>
    );
};

export default SchemaUpload;
