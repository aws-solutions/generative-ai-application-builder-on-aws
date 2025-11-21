// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import ExpandableSection from '@cloudscape-design/components/expandable-section';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { Icon } from '@cloudscape-design/components';
import { UploadedFile } from '../../types/file-upload';
import { formatFileNameForDisplay } from '../../utils/file-upload';
import { useLazyGetFileDownloadUrlQuery } from '../../store/solutionApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useState } from 'react';

interface FileDisplayProps {
    readonly files: UploadedFile[];
    readonly hasError?: boolean;
}

interface FileTagProps {
    file: UploadedFile;
    hasError?: boolean;
    showDownload?: boolean;
}

const FileTag = ({ file, hasError, showDownload = false }: FileTagProps) => {
    const displayName = formatFileNameForDisplay(file.fileName);
    const isNameTruncated = displayName !== file.fileName;
    const [getDownloadUrl] = useLazyGetFileDownloadUrlQuery();
    const useCaseId = useSelector((state: RootState) => state.config.runtimeConfig?.UseCaseId);
    const [isHovered, setIsHovered] = useState(false);

    const handleDownload = async () => {
        if (!useCaseId || !file.conversationId || !file.messageId) {
            console.error('Missing required parameters for download:', {
                useCaseId,
                conversationId: file.conversationId,
                messageId: file.messageId
            });
            return;
        }

        try {
            const result = await getDownloadUrl({
                useCaseId,
                conversationId: file.conversationId,
                messageId: file.messageId,
                fileName: file.fileName
            }).unwrap();

            window.open(result.downloadUrl, '_blank');
        } catch (error) {
            console.error('Failed to get download URL:', error);
        }
    };

    const tagStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        fontSize: '12px',
        lineHeight: '16px',
        color: '#333',
        cursor: showDownload ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        maxWidth: '200px'
    };

    const tagHoverStyle: React.CSSProperties = {
        ...tagStyle,
        backgroundColor: showDownload && isHovered ? '#e8f4fd' : tagStyle.backgroundColor
    };

    if (hasError) {
        return (
            <div style={{ ...tagStyle, backgroundColor: '#fdf2f2' }}>
                <Icon name="status-negative" size="small" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                </span>
            </div>
        );
    }

    return (
        <div
            style={tagHoverStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={showDownload ? handleDownload : undefined}
            title={isNameTruncated ? file.fileName : undefined}
        >
            <Icon name="file" size="small" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {displayName}
            </span>
            {showDownload && isHovered && <Icon name="download" size="small" />}
        </div>
    );
};

export const FileDisplay = ({ files, hasError = false }: FileDisplayProps) => {
    if (!files?.length) return null;

    return (
        <ExpandableSection
            variant="inline"
            headingTagOverride="h5"
            headerText="Attached Files"
            data-testid="file-display"
        >
            <SpaceBetween direction="horizontal" size="xs">
                {files.map((file) => (
                    <FileTag key={file.key} file={file} hasError={hasError} showDownload={true} />
                ))}
            </SpaceBetween>
        </ExpandableSection>
    );
};
