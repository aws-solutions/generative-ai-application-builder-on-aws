// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Modal, Button, SpaceBetween } from '@cloudscape-design/components';

export function ExternalLinkWarningModal({ visible, onDiscard, externalLink }) {
    return (
        visible && (
            <Modal
                onDismiss={onDiscard}
                visible={visible}
                header="Open Source Document"
                footer={
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="link" onClick={onDiscard}>
                                Cancel
                            </Button>
                            <Button
                                ariaLabel="Open Source (opens new tab)"
                                href={externalLink}
                                iconAlign="right"
                                iconName="external"
                                target="_blank"
                                onFollow={onDiscard}
                                data-testid="external-link-warning-modal-open-button"
                                onClick={onDiscard}
                            >
                                Open
                            </Button>
                        </SpaceBetween>
                    </Box>
                }
                data-testid="external-link-warning-modal"
            >
                Are you sure that you want to leave the page?
            </Modal>
        )
    );
}
