// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceDocumentsSection } from '../../../../../pages/chat/components/source-documents/SourceDocument';
import { SourceDocument } from '../../../../../models';

describe('SourceDocumentsSection', () => {
    const mockSourceDocuments: SourceDocument[] = [
        {
            document_title: 'Test Document 1',
            excerpt: 'Test excerpt 1',
            location: 'https://example.com/doc1',
            score: 'VERY_HIGH'
        },
        {
            document_title: 'Test Document 2',
            excerpt: 'Test excerpt 2',
            location: 'https://example.com/doc2',
            score: 'MEDIUM'
        },
        {
            document_title: null,
            excerpt: 'Test excerpt 3',
            location: 'https://example.com/doc3',
            score: 'LOW'
        }
    ];

    it('renders null when sourceDocuments is undefined', () => {
        const { container } = render(<SourceDocumentsSection />);
        expect(container.firstChild).toBeNull();
    });

    it('renders null when sourceDocuments is empty', () => {
        const { container } = render(<SourceDocumentsSection sourceDocuments={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders expandable section with correct header', () => {
        render(<SourceDocumentsSection sourceDocuments={mockSourceDocuments} />);

        const expandableSection = screen.getByTestId('source-doc-expandable-section');
        expect(expandableSection).toBeInTheDocument();
        expect(screen.getByText('Source Documents')).toBeInTheDocument();
    });

    it('renders correct number of documents', () => {
        render(<SourceDocumentsSection sourceDocuments={mockSourceDocuments} />);
        const documentTitles = screen.getAllByText(/Document /);
        expect(documentTitles).toHaveLength(3);
    });

    it('renders document titles as links', () => {
        render(<SourceDocumentsSection sourceDocuments={mockSourceDocuments} />);

        mockSourceDocuments.forEach((doc, index) => {
            const link = screen.getByText(doc.document_title! ?? `Document ${index+1}`);
            expect(link).toBeInTheDocument();
        });
    });

    it('renders popover with VERY_HIGH score content', async () => {
        const user = userEvent.setup();
        render(<SourceDocumentsSection sourceDocuments={[mockSourceDocuments[0]]} />);

        const docLink = screen.getByText(mockSourceDocuments[0].document_title!);
        await user.click(docLink);

        const popover = screen.getByTestId('source-doc-popover');
        expect(popover).toBeInTheDocument();

        expect(screen.getByText('Excerpt')).toBeInTheDocument();
        expect(screen.getByText(mockSourceDocuments[0].excerpt)).toBeInTheDocument();

        expect(screen.getByText('Relevance score')).toBeInTheDocument();
        expect(screen.getByText('VERY_HIGH')).toBeInTheDocument();
        const sourceLink = screen.getByRole('link', { name: 'Open source document'});
        expect(sourceLink).toHaveAttribute('href', mockSourceDocuments[0].location);
    });

    it('renders popover with MEDIUM score content', async () => {
        const user = userEvent.setup();
        render(<SourceDocumentsSection sourceDocuments={[mockSourceDocuments[1]]} />);

        const docLink = screen.getByText(mockSourceDocuments[1].document_title!);
        await user.click(docLink);

        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('renders all possible score values correctly', async () => {
        const user = userEvent.setup();
        const documentsWithDifferentScores: SourceDocument[] = [
            {
                document_title: 'Very High Doc',
                excerpt: 'Excerpt',
                location: 'https://example.com/doc1',
                score: 'VERY_HIGH'
            },
            {
                document_title: 'High Doc',
                excerpt: 'Excerpt',
                location: 'https://example.com/doc2',
                score: 'HIGH'
            },
            {
                document_title: 'Medium Doc',
                excerpt: 'Excerpt',
                location: 'https://example.com/doc3',
                score: 'MEDIUM'
            },
            {
                document_title: 'Low Doc',
                excerpt: 'Excerpt',
                location: 'https://example.com/doc4',
                score: 'LOW'
            },
            {
                document_title: 'Disabled Doc',
                excerpt: 'Excerpt',
                location: 'https://example.com/doc5',
                score: 'DISABLED'
            }
        ];

        render(<SourceDocumentsSection sourceDocuments={documentsWithDifferentScores} />);

        // Test each score value
        for (const doc of documentsWithDifferentScores) {
            const docLink = screen.getByText(doc.document_title!);
            await user.click(docLink);
            expect(screen.getByText(doc.score!)).toBeInTheDocument();
        }
    });

    it('renders popover without score when score is missing', async () => {
        const user = userEvent.setup();
        const documentWithoutScore: SourceDocument[] = [
            {
                document_title: 'No Score Doc',
                location: 'https://example.com/doc4',
                excerpt: 'Test excerpt'
            }
        ];

        render(<SourceDocumentsSection sourceDocuments={documentWithoutScore} />);

        const docLink = screen.getByText(documentWithoutScore[0].document_title!);
        await user.click(docLink);

        expect(screen.queryByText('Relevance score')).not.toBeInTheDocument();
    });

    it('external link opens in new tab when popover is shown', async () => {
        const user = userEvent.setup();
        render(<SourceDocumentsSection sourceDocuments={[mockSourceDocuments[0]]} />);

        // Click the first document title to open the popover
        const docLink = screen.getByText(mockSourceDocuments[0].document_title!);
        await user.click(docLink);

        // Now check the external link in the popover
        await screen.findByTestId('source-doc-popover');

        const externalLink = screen.getByRole('link', { 
            name: (name, element) => (element as HTMLAnchorElement).href === mockSourceDocuments[0].location
        });

        expect(externalLink).toHaveAttribute('target', '_blank');
        expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('external links in all popovers open in new tab', async () => {
        const user = userEvent.setup();
        render(<SourceDocumentsSection sourceDocuments={mockSourceDocuments} />);

        // Test each document's popover
        mockSourceDocuments.forEach(async (doc, index) => {
            // Click document title to open popover
            const docLink = screen.getByText(doc.document_title! ?? `Document ${index+1}`);
            await user.click(docLink);

            // Check external link attributes
            await screen.findByTestId('source-doc-popover');

            const externalLink = screen.getByRole('link', { 
                name: (name, element) => (element as HTMLAnchorElement).href === mockSourceDocuments[0].location
            });
            expect(externalLink).toHaveAttribute('target', '_blank');
            expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
        })
    });
});
