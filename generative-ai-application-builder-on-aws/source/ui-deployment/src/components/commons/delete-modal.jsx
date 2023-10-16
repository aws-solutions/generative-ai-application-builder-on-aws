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

import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, Box, Button, Checkbox, Link, Modal, SpaceBetween } from '@cloudscape-design/components';
import { deleteDeployment } from '../dashboard/deployments';
import { DeleteNotifications } from './delete-notifications';
import { DELAY_AFTER_DELETE_MS, DEPLOYMENT_STATUS_NOTIFICATION, IG_DOCS } from '../../utils/constants';
import HomeContext from '../../home/home.context';

export const onDeleteConfirm = async (deployment, permanentDelete, setUseCaseDeleteStatus) => {
    try {
        setUseCaseDeleteStatus(DEPLOYMENT_STATUS_NOTIFICATION.PENDING);
        await deleteDeployment(deployment.UseCaseId, permanentDelete);
        setUseCaseDeleteStatus(DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS);
    } catch (error) {
        setUseCaseDeleteStatus(DEPLOYMENT_STATUS_NOTIFICATION.FAILURE);
    }
};

export function DeleteDeploymentModal({ deployment, visible, onDiscard, onDelete }) {
    const [permanentDelete, setPermanenentDelete] = useState(false);
    const [useCaseDeleteStatus, setUseCaseDeleteStatus] = useState('');
    const { dispatch: homeDispatch } = useContext(HomeContext);
    const navigate = useNavigate();

    const onDiscardAndClearStatus = () => {
        setUseCaseDeleteStatus('');
        setPermanenentDelete(false);
        onDiscard();
    };

    useEffect(() => {
        if (useCaseDeleteStatus === DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS) {
            setTimeout(() => {
                onDiscardAndClearStatus();
                homeDispatch({
                    field: 'reloadData',
                    value: true
                });
                navigate('/');
            }, DELAY_AFTER_DELETE_MS);
        }
    });

    const isDeleteButtonDisabled =
        useCaseDeleteStatus === DEPLOYMENT_STATUS_NOTIFICATION.PENDING ||
        useCaseDeleteStatus === DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS;

    return (
        deployment && (
            <div>
                <Modal
                    visible={visible}
                    onDismiss={onDiscardAndClearStatus}
                    header={'Delete'}
                    closeAriaLabel="Close dialog"
                    footer={
                        <Box float="right">
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button variant="link" onClick={onDiscardAndClearStatus}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        onDelete(deployment, permanentDelete, setUseCaseDeleteStatus);
                                    }}
                                    data-testid="delete-deployment-modal-button"
                                    disabled={isDeleteButtonDisabled}
                                >
                                    Delete
                                </Button>
                            </SpaceBetween>
                        </Box>
                    }
                    data-testid="delete-deployment-modal"
                >
                    {deployment.StackId && (
                        <SpaceBetween size="m">
                            <Box variant="span">
                                Delete deployment{' '}
                                <Box variant="span" fontWeight="bold">
                                    {deployment.Name}
                                </Box>
                                ? Once this deployment is deleted, the Generative AI application will be removed. The
                                deployment details will still be available to view and clone on the application
                                dashboard.
                                <br /> <br />
                                If you choose to permanently delete this deployment, it will be removed from the
                                dashboard and you will not be able to recover it.
                            </Box>

                            <Checkbox
                                onChange={({ detail }) => setPermanenentDelete(detail.checked)}
                                checked={permanentDelete}
                            >
                                Permanently Delete?
                            </Checkbox>

                            <Alert statusIconAriaLabel="Info">
                                Proceeding with this action will delete the deployment. Some resources, such as the
                                Kendra Index and S3 Buckets will be retained.{' '}
                                <Link
                                    external={true}
                                    href={IG_DOCS.UNINSTALL}
                                    ariaLabel="Learn more about deployment cleanup, opens in new tab"
                                >
                                    Learn more
                                </Link>
                            </Alert>
                            <DeleteNotifications status={useCaseDeleteStatus}></DeleteNotifications>
                        </SpaceBetween>
                    )}
                </Modal>
            </div>
        )
    );
}
