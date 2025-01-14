// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Alert, Box, Button, Link, Modal, SpaceBetween } from '@cloudscape-design/components';
import HomeContext from '../../contexts/home.context';
import { useContext } from 'react';

import { INTERNAL_USER_GENAI_POLICY_URL, LEGAL_DISCLAIMER, deploymentActionText } from '../../utils/constants';

export function ConfirmDeployModal({ visible, onDiscard, onConfirm, deploymentAction, isThirdPartyProvider }) {
    const {
        state: { runtimeConfig }
    } = useContext(HomeContext);

    const onClickAndDismiss = () => {
        onConfirm();
        onDiscard();
    };

    const isInternalUserDeployment = runtimeConfig.IsInternalUser === 'true' ? true : false;

    return (
        visible && (
            <Modal
                visible={visible}
                onDismiss={onDiscard}
                header={'Confirm'}
                closeAriaLabel="Close dialog"
                footer={
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="link" onClick={onDiscard}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={onClickAndDismiss}
                                data-testid="confirm-deployment-modal-submit-btn"
                            >
                                {deploymentActionText[deploymentAction]}
                            </Button>
                        </SpaceBetween>
                    </Box>
                }
                data-testid="confirm-deployment-modal"
            >
                {
                    <SpaceBetween size="m">
                        {isInternalUserDeployment && (
                            <Alert
                                statusIconAriaLabel="Warning"
                                type="warning"
                                data-testid="internal-user-disclaimer-alert"
                                header="Amazon's Third-Party Generative AI Use Policy"
                            >
                                <Box variant="p">
                                    You must ensure you are complying with Amazon's{' '}
                                    <Link
                                        external={false}
                                        href={INTERNAL_USER_GENAI_POLICY_URL}
                                        target="_blank"
                                        ariaLabel="internal user policy document"
                                        data-testid="internal-policy-doc-link"
                                    >
                                        Third-Party Generative AI Use Policy
                                    </Link>
                                    , including not sharing any confidential information without required approvals.
                                </Box>
                            </Alert>
                        )}
                        {isThirdPartyProvider && (
                            <Alert statusIconAriaLabel="warning" type="info" data-testid="legal-disclaimer-alert">
                                <Box variant="p">{LEGAL_DISCLAIMER}</Box>
                            </Alert>
                        )}

                        {!isInternalUserDeployment && !isThirdPartyProvider && (
                            <Box variant="awsui-key-label">Do you want to proceed?</Box>
                        )}
                    </SpaceBetween>
                }
            </Modal>
        )
    );
}
