// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Button, Header, HeaderProps, SpaceBetween } from '@cloudscape-design/components';
import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeContext from '../../contexts/home.context';
import { CFN_STACK_STATUS_INDICATOR, DEPLOYMENT_ACTIONS } from '../../utils/constants';
import { getUseCaseRoute } from '../../utils/utils';
import { statusIndicatorTypeSelector } from '../dashboard/deployments';
import { InfoLink } from './info-link';

interface FullPageHeaderProps extends HeaderProps {
    title?: string;
    createButtonText?: string;
    extraActions?: React.ReactNode;
    onInfoLinkClick?: () => void;
    selectedItems: ReadonlyArray<any>;
    setSelectedItems: (newSelectedItems: ReadonlyArray<any>) => void;
    refreshData: (isReload: boolean) => void;
    onDeleteInit: () => void;
}

export function FullPageHeader({
    title = 'Deployments',
    createButtonText = 'Deploy new use case',
    extraActions = null,
    refreshData,
    onDeleteInit,
    onInfoLinkClick,
    selectedItems,
    setSelectedItems,
    ...props
}: FullPageHeaderProps) {
    const navigate = useNavigate();

    const {
        state: { selectedDeployment },
        dispatch: homeDispatch
    } = useContext(HomeContext);

    const navigateWizardDestination = getUseCaseRoute(selectedDeployment.UseCaseType);

    function handleOnDeploymentIdClick() {
        navigate(`/deployment-details/${selectedDeployment.UseCaseType}/${selectedDeployment.UseCaseId}`);
    }

    function handleEditDeploymentClick() {
        homeDispatch({
            field: 'selectedDeployment',
            value: selectedItems[0]
        });
        homeDispatch({
            field: 'selectedTenantId',
            value: selectedItems[0]?.TenantId ?? ''
        });
        homeDispatch({
            field: 'deploymentAction',
            value: DEPLOYMENT_ACTIONS.EDIT
        });
        navigate(navigateWizardDestination);
    }

    function handleCloneDeploymentClick() {
        homeDispatch({
            field: 'selectedDeployment',
            value: selectedItems[0]
        });
        homeDispatch({
            field: 'selectedTenantId',
            value: selectedItems[0]?.TenantId ?? ''
        });
        homeDispatch({
            field: 'deploymentAction',
            value: DEPLOYMENT_ACTIONS.CLONE
        });
        navigate(navigateWizardDestination);
    }

    function handleCreateDeploymentClick() {
        homeDispatch({
            field: 'selectedDeployment',
            value: {}
        });
        homeDispatch({
            field: 'selectedTenantId',
            value: ''
        });
        homeDispatch({
            field: 'deploymentAction',
            value: DEPLOYMENT_ACTIONS.CREATE
        });
        navigate(`/create`);
    }

    const currentDeploymentStatus = statusIndicatorTypeSelector(selectedDeployment.status);

    const isEditEnabled =
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.SUCCESS ||
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.WARNING;

    const isCloneEnabled =
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.SUCCESS ||
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.WARNING ||
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.STOPPED;

    const isDeleteEnabled = currentDeploymentStatus !== CFN_STACK_STATUS_INDICATOR.IN_PROGRESS;

    const handleRefresh = () => {
        homeDispatch({
            field: 'selectedDeployment',
            value: {}
        });
        setSelectedItems([]);
        homeDispatch({
            field: 'reloadData',
            value: true
        });
    };

    useEffect(() => {
        window.addEventListener('beforeunload', handleRefresh);
        return () => {
            Object.defineProperty(window, 'onbeforeunload', {
                value: undefined,
                configurable: true
            });
        };
    }, []);

    return (
        <Header
            variant="awsui-h1-sticky"
            info={onInfoLinkClick && <InfoLink onFollow={onInfoLinkClick} ariaLabel={`Information about ${title}.`} />}
            actions={
                <SpaceBetween size="xs" direction="horizontal">
                    {extraActions}
                    <Button data-testid="data-refresh-btn" variant="icon" iconName="refresh" onClick={handleRefresh} />
                    <Button
                        onClick={() => handleOnDeploymentIdClick()}
                        data-testid="header-btn-view-details"
                        disabled={selectedItems.length < 1}
                    >
                        View details
                    </Button>
                    <Button
                        onClick={() => handleEditDeploymentClick()}
                        data-testid="header-btn-edit"
                        disabled={!isEditEnabled || selectedItems.length !== 1}
                    >
                        Edit
                    </Button>
                    <Button
                        onClick={() => handleCloneDeploymentClick()}
                        data-testid="header-btn-clone"
                        disabled={!isCloneEnabled || selectedItems.length !== 1}
                    >
                        Clone
                    </Button>
                    <Button
                        data-testid="header-btn-delete"
                        onClick={onDeleteInit}
                        disabled={!isDeleteEnabled || selectedItems.length < 1}
                    >
                        Delete
                    </Button>
                    <Button
                        onClick={() => handleCreateDeploymentClick()}
                        data-testid="header-btn-create"
                        variant="primary"
                    >
                        {createButtonText}
                    </Button>
                </SpaceBetween>
            }
            {...props}
        >
            {title}
        </Header>
    );
}
