// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { Notifications } from '../notifications';
import { DEPLOYMENT_STATUS_NOTIFICATION } from '@/utils/constants';

describe('Notifications', () => {
    const mockOnSuccessButtonAction = vi.fn();

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders success notification', () => {
        render(
            <Notifications
                status={DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS}
                onSuccessButtonAction={mockOnSuccessButtonAction}
            />
        );

        expect(screen.getByText('Use case deployment request submitted successfully. You can view the deployment status in the deployment dashboard.')).toBeInTheDocument();
    });

    test('renders failure notification', () => {
        render(
            <Notifications
                status={DEPLOYMENT_STATUS_NOTIFICATION.FAILURE}
                onSuccessButtonAction={mockOnSuccessButtonAction}
            />
        );

        expect(screen.getByText('Failed to deploy use case. Please contact your administrator for support.')).toBeInTheDocument();
    });

    test('renders pending notification', () => {
        render(
            <Notifications
                status={DEPLOYMENT_STATUS_NOTIFICATION.PENDING}
                onSuccessButtonAction={mockOnSuccessButtonAction}
            />
        );

        expect(screen.getByText('Deployment request is in progress..')).toBeInTheDocument();
    });

    test('renders schema upload pending notification for single file', () => {
        render(
            <Notifications
                status={DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_PENDING}
                onSuccessButtonAction={mockOnSuccessButtonAction}
                fileCount={1}
            />
        );

        expect(screen.getByText('MCP schema file is being uploaded...')).toBeInTheDocument();
        expect(screen.getByText('Uploading Schema File')).toBeInTheDocument();
    });

    test('renders schema upload pending notification for multiple files', () => {
        render(
            <Notifications
                status={DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_PENDING}
                onSuccessButtonAction={mockOnSuccessButtonAction}
                fileCount={3}
            />
        );

        expect(screen.getByText('MCP schema files are being uploaded...')).toBeInTheDocument();
        expect(screen.getByText('Uploading Schema Files')).toBeInTheDocument();
    });

    test('renders schema upload failure notification for single file', () => {
        render(
            <Notifications
                status={DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE}
                onSuccessButtonAction={mockOnSuccessButtonAction}
                fileCount={1}
            />
        );

        expect(screen.getByText('MCP schema file upload failed. Please check your file and try again.')).toBeInTheDocument();
        expect(screen.getByText('Schema Upload Failed')).toBeInTheDocument();
    });

    test('renders schema upload failure notification for multiple files', () => {
        render(
            <Notifications
                status={DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE}
                onSuccessButtonAction={mockOnSuccessButtonAction}
                fileCount={2}
            />
        );

        expect(screen.getByText('MCP schema files upload failed. Please check your files and try again.')).toBeInTheDocument();
        expect(screen.getByText('Schema Upload Failed')).toBeInTheDocument();
    });

    test('renders custom schema upload error message', () => {
        const customErrorMessage = 'MCP schema file upload failed for: test-file.json';

        render(
            <Notifications
                status={DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE}
                onSuccessButtonAction={mockOnSuccessButtonAction}
                schemaUploadErrorMessage={customErrorMessage}
                fileCount={1}
            />
        );

        expect(screen.getByText(customErrorMessage)).toBeInTheDocument();
    });

    test('handles zero file count gracefully', () => {
        render(
            <Notifications
                status={DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_PENDING}
                onSuccessButtonAction={mockOnSuccessButtonAction}
                fileCount={0}
            />
        );

        // Should default to plural form for 0 files
        expect(screen.getByText('MCP schema files are being uploaded...')).toBeInTheDocument();
    });

    test('does not render notification when status is empty', () => {
        const { container } = render(
            <Notifications
                status=""
                onSuccessButtonAction={mockOnSuccessButtonAction}
            />
        );

        // Should render empty flashbar
        expect(container.firstChild).toBeInTheDocument();
        expect(screen.queryByText('Use case deployed successfully')).not.toBeInTheDocument();
    });
});