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
