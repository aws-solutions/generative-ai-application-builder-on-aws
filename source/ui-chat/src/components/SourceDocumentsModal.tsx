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
    source: string;
    excerpt: string;
    documentId: string;
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
                            key={sourceDoc['result_id']}
                            title={sourceDoc.title}
                            source={sourceDoc.source}
                            excerpt={sourceDoc.excerpt}
                            documentId={sourceDoc['document_id']}
                        />
                    );
                })}
            </SpaceBetween>
        </Modal>
    );
};

export const SourceDocSection: React.FC<SourceDocSectionProps> = ({ title, source, excerpt, documentId }) => {
    const [externalLinkModalVisible, setExternalLinkModalVisible] = React.useState(false);
    const onModalDismiss = () => setExternalLinkModalVisible(false);

    return (
        <Box>
            <ExpandableSection headerText={title} data-testid="expandable-doc-source-section">
                <SpaceBetween size="s">
                    <div>
                        <Box variant="awsui-key-label">Source</Box>
                        <Link onFollow={() => setExternalLinkModalVisible(true)}>{documentId}</Link>

                        <ExternalLinkWarningModal
                            data-testid="external-link-warning-modal"
                            visible={externalLinkModalVisible}
                            onDiscard={onModalDismiss}
                            externalLink={source}
                        />
                    </div>

                    <div>
                        <Box variant="awsui-key-label">Excerpt</Box>
                        <Box variant="p">{excerpt}</Box>
                    </div>
                </SpaceBetween>
            </ExpandableSection>
        </Box>
    );
};
