// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Modal, Button, SpaceBetween, Alert } from '@cloudscape-design/components';

interface ExternalLinkWarningModalProps {
    visible: boolean;
    onDiscard: () => void;
    externalLink: string;
    resourceType?: string;
}

export function ExternalLinkWarningModal({ 
    visible, 
    onDiscard, 
    externalLink, 
    resourceType = 'external link' 
}: ExternalLinkWarningModalProps) {
    return (
        visible && (
            <Modal
                onDismiss={onDiscard}
                visible={visible}
                header="Leave page"
                footer={
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="link" onClick={onDiscard}>
                                Cancel
                            </Button>
                            <Button
                                ariaLabel={`Open ${resourceType} (opens new tab)`}
                                href={externalLink}
                                iconAlign="right"
                                iconName="external"
                                target="_blank"
                                onFollow={onDiscard}
                                data-testid="external-link-warning-modal-open-button"
                            >
                                Open {resourceType}
                            </Button>
                        </SpaceBetween>
                    </Box>
                }
                data-testid="external-link-warning-modal"
            >
                <Alert type="warning">
                    Are you sure that you want to leave the current page? You will be redirected to an external website.
                </Alert>
            </Modal>
        )
    );
}