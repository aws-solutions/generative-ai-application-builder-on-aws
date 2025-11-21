// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { FileDisplay } from '../FileDisplay';
import { UploadedFile } from '../../../types/file-upload';
import { solutionApi } from '../../../store/solutionApi';

const mockGetFileDownloadUrl = vi.fn();
vi.mock('../../../store/solutionApi', () => ({
    solutionApi: {
        reducer: (state = {}) => state,
        reducerPath: 'solution-api',
        middleware: vi.fn(() => (next: any) => (action: any) => next(action))
    },
    useLazyGetFileDownloadUrlQuery: () => [mockGetFileDownloadUrl, { isLoading: false }]
}));

const mockUploadedFile: UploadedFile = {
    key: 'test-key-1',
    fileName: 'test-document.pdf',
    fileContentType: 'application/pdf',
    fileExtension: 'pdf',
    fileSize: 1024,
    messageId: 'test-message-id',
    conversationId: 'test-conversation-id'
};

const createMockStore = (useCaseId?: string) => {
    return configureStore({
        reducer: {
            config: (state = { runtimeConfig: { UseCaseId: useCaseId } }) => state,
            [solutionApi.reducerPath]: solutionApi.reducer
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(solutionApi.middleware)
    });
};

const renderWithProvider = (component: React.ReactElement, useCaseId?: string) => {
    const store = createMockStore(useCaseId);
    return render(<Provider store={store}>{component}</Provider>);
};

describe('FileDisplay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.document.createElement = vi.fn((tagName) => {
            if (tagName === 'a') {
                return {
                    href: '',
                    download: '',
                    target: '',
                    click: vi.fn(),
                    style: {}
                } as any;
            }
            return {} as any;
        });
        global.document.body.appendChild = vi.fn();
        global.document.body.removeChild = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders nothing when no files provided', () => {
            renderWithProvider(<FileDisplay files={[]} />);
            expect(screen.queryByTestId('file-display')).not.toBeInTheDocument();
        });

        test('renders expandable section with correct header when files provided', () => {
            renderWithProvider(<FileDisplay files={[mockUploadedFile]} />);

            expect(screen.getByTestId('file-display')).toBeInTheDocument();
            expect(screen.getByText('Attached Files')).toBeInTheDocument();
        });

        test('renders multiple files correctly', () => {
            const secondFile: UploadedFile = { ...mockUploadedFile, key: 'test-key-2', fileName: 'second-file.pdf' };
            const multipleFiles = [mockUploadedFile, secondFile];
            renderWithProvider(<FileDisplay files={multipleFiles} />);

            expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
            expect(screen.getByText('second-file.pdf')).toBeInTheDocument();
        });
    });

    describe('Error States', () => {
        test('shows error status indicator when hasError is true', () => {
            renderWithProvider(<FileDisplay files={[mockUploadedFile]} hasError={true} />);

            const errorIndicator = screen.getByRole('img', { name: 'File processing failed' });
            expect(errorIndicator).toBeInTheDocument();
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
        });

        test('does not show download functionality when file has error', () => {
            renderWithProvider(<FileDisplay files={[mockUploadedFile]} hasError={true} />, 'test-use-case-id');

            const fileTag = screen.getByText('test-document.pdf').closest('div');
            expect(fileTag).toHaveStyle('cursor: default');

            // Hover should not show download icon for error state
            fireEvent.mouseEnter(fileTag!);
            expect(screen.queryByRole('img', { name: 'download' })).not.toBeInTheDocument();
        });
    });

    describe('Normal File Display', () => {
        test('shows normal file display when hasError is false', () => {
            renderWithProvider(<FileDisplay files={[mockUploadedFile]} hasError={false} />);

            expect(screen.queryByRole('img', { name: 'File processing failed' })).not.toBeInTheDocument();
            expect(screen.getByRole('img', { name: 'file' })).toBeInTheDocument();
            expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
        });

        test('shows download icon on hover', async () => {
            renderWithProvider(<FileDisplay files={[mockUploadedFile]} />, 'test-use-case-id');

            const fileTag = screen.getByText('test-document.pdf').closest('div');
            expect(fileTag).toBeInTheDocument();
            expect(screen.queryByRole('img', { name: 'download' })).not.toBeInTheDocument();
            fireEvent.mouseEnter(fileTag!);
            await waitFor(() => {
                expect(screen.getByRole('img', { name: 'download' })).toBeInTheDocument();
            });
            fireEvent.mouseLeave(fileTag!);
            
            await waitFor(() => {
                expect(screen.queryByRole('img', { name: 'download' })).not.toBeInTheDocument();
            });
        });

        test('shows multiple file tags correctly', () => {
            const secondFile: UploadedFile = { ...mockUploadedFile, key: 'test-key-2', fileName: 'second-file.pdf' };
            const multipleFiles = [mockUploadedFile, secondFile];
            renderWithProvider(<FileDisplay files={multipleFiles} />, 'test-use-case-id');

            expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
            expect(screen.getByText('second-file.pdf')).toBeInTheDocument();

            const firstTag = screen.getByText('test-document.pdf').closest('div');
            const secondTag = screen.getByText('second-file.pdf').closest('div');

            expect(firstTag).toHaveStyle('cursor: pointer');
            expect(secondTag).toHaveStyle('cursor: pointer');
        });
    });

    describe('File Name Display', () => {
        test('shows file title tooltip for truncated file names', () => {
            const longNameFile: UploadedFile = {
                ...mockUploadedFile,
                fileName: 'very-long-file-name-that-exceeds-display-limit.pdf'
            };
            renderWithProvider(<FileDisplay files={[longNameFile]} />);

            const fileElement = screen.getByText(/very-long-file-name/).closest('div');
            expect(fileElement).toHaveAttribute('title', longNameFile.fileName);
        });

        test('does not show tooltip for non-truncated file names', () => {
            renderWithProvider(<FileDisplay files={[mockUploadedFile]} />);

            const fileElement = screen.getByText('test-document.pdf').closest('div');
            expect(fileElement).not.toHaveAttribute('title');
        });
    });

    describe('Download Functionality', () => {
        test('file tag is not clickable when useCaseId is not available', () => {
            renderWithProvider(<FileDisplay files={[mockUploadedFile]} />); // No useCaseId

            const fileTag = screen.getByText('test-document.pdf').closest('div');
            expect(fileTag).toHaveStyle('cursor: default');
        });

        test('calls download API when file tag is clicked', async () => {
            const mockDownloadResponse = { downloadUrl: 'https://example.com/download/test-file' };
            mockGetFileDownloadUrl.mockReturnValue({
                unwrap: vi.fn().mockResolvedValue(mockDownloadResponse)
            });

            renderWithProvider(<FileDisplay files={[mockUploadedFile]} />, 'test-use-case-id');

            const fileTag = screen.getByText('test-document.pdf').closest('div');
            fireEvent.click(fileTag!);

            await waitFor(() => {
                expect(mockGetFileDownloadUrl).toHaveBeenCalledWith({
                    useCaseId: 'test-use-case-id',
                    conversationId: 'test-conversation-id',
                    messageId: 'test-message-id',
                    fileName: 'test-document.pdf'
                });
            });
        });

        test('creates and clicks download link when API call succeeds', async () => {
            const mockDownloadResponse = { downloadUrl: 'https://example.com/download/test-file' };
            const mockLink = {
                href: '',
                download: '',
                target: '',
                click: vi.fn(),
                style: {}
            };

            mockGetFileDownloadUrl.mockReturnValue({
                unwrap: vi.fn().mockResolvedValue(mockDownloadResponse)
            });

            global.document.createElement = vi.fn().mockReturnValue(mockLink);

            renderWithProvider(<FileDisplay files={[mockUploadedFile]} />, 'test-use-case-id');

            const fileTag = screen.getByText('test-document.pdf').closest('div');
            fireEvent.click(fileTag!);

            await waitFor(() => {
                expect(mockLink.href).toBe('https://example.com/download/test-file');
                expect(mockLink.download).toBe('test-document.pdf');
                expect(mockLink.target).toBe('_blank');
                expect(mockLink.click).toHaveBeenCalled();
                expect(global.document.body.appendChild).toHaveBeenCalledWith(mockLink);
                expect(global.document.body.removeChild).toHaveBeenCalledWith(mockLink);
            });
        });

        test('logs error when download API call fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockError = new Error('Download failed');

            mockGetFileDownloadUrl.mockReturnValue({
                unwrap: vi.fn().mockRejectedValue(mockError)
            });

            renderWithProvider(<FileDisplay files={[mockUploadedFile]} />, 'test-use-case-id');

            const fileTag = screen.getByText('test-document.pdf').closest('div');
            fireEvent.click(fileTag!);

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get download URL:', mockError);
            });

            consoleErrorSpy.mockRestore();
        });
    });
});
