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

import { Box, Modal, Button, SpaceBetween, Alert } from '@cloudscape-design/components';

export function ExternalLinkWarningModal({ visible, onDiscard, externalLink, resourceType }) {
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
                                ariaLabel="Open AWS Console (opens new tab)"
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
                    Are you sure that you want to leave the current page? You need an AWS account with the appropriate
                    permissions to view the {resourceType}.
                </Alert>
            </Modal>
        )
    );
}
