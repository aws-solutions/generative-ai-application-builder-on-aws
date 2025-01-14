// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent } from '@testing-library/react';
import {
    SourceDocumentsModal,
    SourceDocSection,
    SourceDocumentsModalProps,
    SourceDocSectionProps
} from '../SourceDocumentsModal';

describe('SourceDocumentsModal', () => {
    const mockOnDismiss = jest.fn();
    const mockSourceDocumentsData = [
        {
            document_title: 'Test Document 1',
            location: 's3://test-bucket/test-doc-1.pdf',
            excerpt: 'This is a test excerpt 1',
            document_id: 'doc1',
            score: 0.95
        },
        {
            document_title: 'Test Document 2',
            location: 'https://example.com/test-doc-2.pdf',
            excerpt: 'This is a test excerpt 2',
            document_id: 'doc2',
            score: 0.85
        }
    ];

    const renderModal = (props: Partial<SourceDocumentsModalProps> = {}) => {
        const defaultProps: SourceDocumentsModalProps = {
            visible: true,
            onDismiss: mockOnDismiss,
            sourceDocumentsData: mockSourceDocumentsData
        };
        return render(<SourceDocumentsModal {...defaultProps} {...props} />);
    };

    test('renders modal with correct title and source documents', () => {
        renderModal();

        expect(screen.getByTestId('source-doc-modal')).toBeInTheDocument();
        expect(screen.getByText(`Source Documents (${mockSourceDocumentsData.length})`)).toBeInTheDocument();
        expect(screen.getAllByTestId(/expandable-doc-source-section-/)).toHaveLength(mockSourceDocumentsData.length);
    });

    test('calls onDismiss when close button is clicked', () => {
        renderModal();

        fireEvent.click(screen.getByText('Close'));
        expect(mockOnDismiss).toHaveBeenCalled();
    });
});

describe('SourceDocSection', () => {
    const mockProps: SourceDocSectionProps = {
        title: 'Test Document',
        location: 's3://test-bucket/test-doc.pdf',
        excerpt: 'This is a test excerpt',
        documentId: 'doc123',
        score: 0.9,
        index: 0
    };

    const renderSection = (props: Partial<SourceDocSectionProps> = {}) => {
        return render(<SourceDocSection {...mockProps} {...props} />);
    };

    test('renders source document section with correct information', () => {
        renderSection();

        expect(screen.getByText(mockProps.title)).toBeInTheDocument();
        expect(screen.getByText('Source')).toBeInTheDocument();
        expect(screen.getByText(mockProps.documentId)).toBeInTheDocument();
        expect(screen.getByText('Excerpt')).toBeInTheDocument();
        expect(screen.getByText(mockProps.excerpt)).toBeInTheDocument();
        expect(screen.getByText('Score')).toBeInTheDocument();
        expect(screen.getByText(mockProps.score.toString())).toBeInTheDocument();
    });

    test('opens external link warning modal when link is clicked', () => {
        renderSection();

        fireEvent.click(screen.getByText(mockProps.documentId));
        expect(screen.getByTestId('external-link-warning-modal')).toBeInTheDocument();
    });

    test('converts S3 location to correct URL', () => {
        renderSection();

        fireEvent.click(screen.getByText(mockProps.documentId));
        const modal = screen.getByTestId('external-link-warning-modal');
        expect(modal).toBeDefined();
    });
});
