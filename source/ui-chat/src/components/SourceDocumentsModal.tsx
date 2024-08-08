/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import * as React from 'react';
import { v4 as uuid } from 'uuid';
import Modal from '@cloudscape-design/components/modal';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import { Button, Link } from '@cloudscape-design/components';
import { ExternalLinkWarningModal } from './external-link-warning-modal';

export interface SourceDocumentsModalProps {
    visible: boolean;
    onDismiss: () => void;
    sourceDocumentsData: any;
}

export interface SourceDocSectionProps {
    title: string;
    location: string;
    excerpt: string;
    documentId: string;
    score: string | number;
    index: number;
}

export const SourceDocumentsModal: React.FC<SourceDocumentsModalProps> = ({
    visible,
    onDismiss,
    sourceDocumentsData
}) => {
    return (
        <Modal
            visible={visible}
            size="large"
            closeAriaLabel="Close"
            header={`Source Documents (${sourceDocumentsData.length})`}
            onDismiss={onDismiss}
            footer={
                <Box float="right">
                    <Button variant="link" onClick={onDismiss}>
                        Close
                    </Button>
                </Box>
            }
            data-testid="source-doc-modal"
        >
            <SpaceBetween direction="vertical" size="l">
                {sourceDocumentsData.map((sourceDoc: any, _index: any) => {
                    return (
                        <SourceDocSection
                            key={`${sourceDoc.location}-${uuid()}`}
                            title={sourceDoc.document_title}
                            location={sourceDoc.location}
                            excerpt={sourceDoc.excerpt}
                            documentId={sourceDoc.document_id}
                            score={sourceDoc.score}
                            index={_index}
                        />
                    );
                })}
            </SpaceBetween>
        </Modal>
    );
};

export const SourceDocSection: React.FC<SourceDocSectionProps> = ({
    title,
    location,
    excerpt,
    documentId,
    score,
    index
}) => {
    const [externalLinkModalVisible, setExternalLinkModalVisible] = React.useState(false);
    const onModalDismiss = () => setExternalLinkModalVisible(false);

    // converts an s3 location to a URL we can navigate to in the browser
    let locationUrl = location.startsWith('s3://') ? `https://s3.amazonaws.com/${location.substring(5)}` : location;

    return (
        <Box>
            <ExpandableSection
                headerText={title ?? `Source Document ${index + 1}`}
                data-testid={`expandable-doc-source-section-${index}`}
            >
                <SpaceBetween size="s">
                    <div>
                        <Box variant="awsui-key-label">Source</Box>
                        <Link onFollow={() => setExternalLinkModalVisible(true)}>{documentId ?? location}</Link>

                        <ExternalLinkWarningModal
                            data-testid={`external-link-warning-modal`}
                            visible={externalLinkModalVisible}
                            onDiscard={onModalDismiss}
                            externalLink={locationUrl}
                        />
                    </div>

                    <div>
                        <Box variant="awsui-key-label">Excerpt</Box>
                        <Box variant="p">{excerpt}</Box>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Score</Box>
                        <Box variant="p">{score}</Box>
                    </div>
                </SpaceBetween>
            </ExpandableSection>
        </Box>
    );
};
