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
