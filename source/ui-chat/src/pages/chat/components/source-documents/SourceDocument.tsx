// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ExpandableSection, Link, SpaceBetween, Box, Popover } from '@cloudscape-design/components';
import { v4 as uuidv4 } from 'uuid';
import { SourceDocument } from '../../../../models';

/**
 * Props interface for the SourceDocumentsSection component
 * @interface SourceDocumentsSectionProps
 * @property {SourceDocument[]} [sourceDocuments] - Optional array of source documents to display
 */
interface SourceDocumentsSectionProps {
    sourceDocuments?: SourceDocument[];
}

/**
 * Renders a popover with source document details
 * @param {SourceDocument} doc - The source document to display
 * @returns {JSX.Element} Rendered popover content with excerpt, relevance score and link
 */
const renderSourceDocumentPopover = (doc: SourceDocument) => {
    return (
        <SpaceBetween size="s">
            {doc.excerpt && (
                <>
                    <Box variant="awsui-key-label" fontSize="body-m">
                        Excerpt
                    </Box>
                    <Box variant="p">{doc.excerpt}</Box>
                </>
            )}

            {doc.score && (
                <>
                    <Box variant="awsui-key-label" fontSize="body-m">
                        Relevance score
                    </Box>
                    <Box variant="p">{doc.score}</Box>
                </>
            )}
            <Link href={doc.location} external>
                Open source document
            </Link>
        </SpaceBetween>
    );
};

/**
 * Component that displays an expandable section containing source documents
 * Each document is shown in a popover with its title, excerpt and relevance score
 * @param {SourceDocumentsSectionProps} props - Component props
 * @returns {JSX.Element|null} Rendered expandable section with source documents or null if no documents
 */
export const SourceDocumentsSection: React.FC<SourceDocumentsSectionProps> = ({ sourceDocuments }) => {
    if (!sourceDocuments || sourceDocuments.length === 0) {
        return null;
    }

    return (
        <ExpandableSection headerText="Source Documents" variant="footer" data-testid="source-doc-expandable-section">
            <SpaceBetween size="m">
                {sourceDocuments.map((doc, index) => (
                    <Box key={uuidv4()}>
                        <Popover
                            size="large"
                            position="top"
                            triggerType="custom"
                            content={renderSourceDocumentPopover(doc)}
                            header="Source Document"
                            dismissButton={true}
                            data-testid="source-doc-popover"
                        >
                            <Link variant="info">{doc.document_title ?? `Document ${index+1}`}</Link>
                        </Popover>
                    </Box>
                ))}
            </SpaceBetween>
        </ExpandableSection>
    );
};
