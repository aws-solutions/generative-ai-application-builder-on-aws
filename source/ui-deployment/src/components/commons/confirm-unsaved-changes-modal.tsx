// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Modal, Button, SpaceBetween } from '@cloudscape-design/components';

export interface ConfirmUnsavedChangesModalProps {
    visible: boolean;
    setVisible: React.Dispatch<React.SetStateAction<boolean>>;
    confirmHandler: any;
    headerText?: string;
    cancelText?: string;
    confirmText?: string;
    children?: any;
}

export function ConfirmUnsavedChangesModal({
    visible,
    setVisible,
    confirmHandler,
    headerText = 'Are you sure you wish to continue?',
    cancelText = 'Cancel',
    confirmText = 'Confirm',
    children = "Changes that you've made will be lost"
}: ConfirmUnsavedChangesModalProps) {
    return (
        visible && (
            <Modal
                onDismiss={() => setVisible(false)}
                visible={visible}
                header={headerText}
                footer={
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="link" onClick={() => setVisible(false)}>
                                {cancelText}
                            </Button>
                            <Button variant="primary" onClick={confirmHandler}>
                                {confirmText}
                            </Button>
                        </SpaceBetween>
                    </Box>
                }
            >
                {children}
            </Modal>
        )
    );
}
