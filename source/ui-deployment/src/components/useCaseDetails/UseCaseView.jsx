// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createRef, useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Alert, AppLayout, Button, ContentLayout, SpaceBetween, StatusIndicator, Tabs } from '@cloudscape-design/components';

import { Navigation, Notifications } from '../commons/common-components';
import { appLayoutAriaLabels } from '../../i18n-strings';
import { ToolsContent } from '../../utils/tools-content';
import HomeContext from '../../contexts/home.context';
import { parseStackName } from '../commons/table-config';
import { DeleteDeploymentModal, onDeleteConfirm } from '../commons/delete-modal';
import {
    CFN_STACK_STATUS_INDICATOR,
    DEPLOYMENT_ACTIONS,
    USECASE_TYPE_ROUTE,
    USECASE_TYPES
} from '../../utils/constants';
import { statusIndicatorTypeSelector } from '../dashboard/deployments';

import { useUseCaseDetailsQuery } from '@/hooks/useQueries';
import { mapApiResponseToSelectedDeployment } from '@/utils';
import { General } from './general/General';
import { Model } from './model/Model';
import { KnowledgeBase } from './knowledgeBase/KnowledgeBase';
import { Prompt } from './prompt/Prompt';
import { PageHeader } from './layout/PageHeader';
import { Breadcrumbs } from './layout/Breadcrumbs';
import { Agent } from './agent/Agent';

export default function UseCaseView() {
    const { useCaseId } = useParams(); // Get useCaseId from URL params
    const {
        data: apiResponse,
        isLoading,
        isSuccess,
        error
    } = useUseCaseDetailsQuery(useCaseId, {
        refetchOnWindowFocus: false
    });

    const {
        state: { runtimeConfig },
        dispatch: homeDispatch
    } = useContext(HomeContext);
    const navigate = useNavigate();

    const appLayout = createRef();
    const [toolsOpen, setToolsOpen] = useState(false);
    const [, setToolsIndex] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const hasUpdatedRef = useRef(false);

    const selectedDeployment = isSuccess ? mapApiResponseToSelectedDeployment(apiResponse) : null;

    // Update context when data is successfully loaded
    useEffect(() => {
        if (isSuccess && selectedDeployment && !hasUpdatedRef.current) {
            homeDispatch({
                field: 'selectedDeployment',
                value: selectedDeployment
            });
            hasUpdatedRef.current = true;
        }
    }, [isSuccess, selectedDeployment, homeDispatch]);

    // Reset the ref when the ID changes
    useEffect(() => {
        hasUpdatedRef.current = false;
    }, [useCaseId]);

    // Handle loading state
    if (isLoading) {
        return (
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                <StatusIndicator type="loading">Loading deployment details...</StatusIndicator>
            </div>
        );
    }

    // Handle error state
    if (error) {
        return (
            <div style={{ padding: '20px' }}>
                <Alert type="error" data-testid="use-case-view-error">
                    Unable to load deployment details.
                </Alert>
            </div>
        );
    }

    // Handle case where data is not available after loading
    if (!selectedDeployment) {
        return <div style={{ padding: '20px' }}>No deployment details found for ID: {useCaseId}</div>;
    }

    const navigateDestination =
        USECASE_TYPE_ROUTE[selectedDeployment.UseCaseType?.toUpperCase()] ?? USECASE_TYPE_ROUTE.TEXT;

    const onDeleteInit = () => setShowDeleteModal(true);
    const onDeleteDiscard = () => setShowDeleteModal(false);

    function loadHelpPanelContent(index) {
        setToolsIndex(index);
        setToolsOpen(true);
        appLayout.current?.focusToolsClose();
    }

    let tabs = [
        {
            label: 'Model',
            id: 'model',
            content: <Model loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />,
            key: 'model'
        },
        {
            label: 'Knowledge base',
            id: 'knowledgeBase',
            content: (
                <KnowledgeBase
                    loadHelpPanelContent={loadHelpPanelContent}
                    selectedDeployment={selectedDeployment}
                    runtimeConfig={runtimeConfig}
                />
            ),
            key: 'knowledgeBase'
        },
        {
            label: 'Prompt',
            id: 'prompt',
            content: <Prompt loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />,
            key: 'prompt'
        }
    ];

    if (selectedDeployment.UseCaseType === USECASE_TYPES.AGENT) {
        tabs = [
            {
                label: 'Agent',
                id: 'agent',
                content: <Agent loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />,
                key: 'agent'
            }
        ];
    }

    const onEditClickAction = () => {
        homeDispatch({
            field: 'selectedDeployment',
            value: selectedDeployment
        });
        homeDispatch({
            field: 'deploymentAction',
            value: DEPLOYMENT_ACTIONS.EDIT
        });
        navigate(navigateDestination);
    };

    const onCloneClickAction = () => {
        homeDispatch({
            field: 'selectedDeployment',
            value: selectedDeployment
        });
        homeDispatch({
            field: 'deploymentAction',
            value: DEPLOYMENT_ACTIONS.CLONE
        });
        navigate(navigateDestination);
    };

    const onFollowNavigationHandler = (event) => {
        navigate(event.detail.href);
    };

    const currentDeploymentStatus = statusIndicatorTypeSelector(selectedDeployment.status);
    const isEditEnabled =
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.SUCCESS ||
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.WARNING;
    const isCloneEnabled =
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.SUCCESS ||
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.WARNING ||
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.STOPPED;
    const isDeleteEnabled = currentDeploymentStatus !== CFN_STACK_STATUS_INDICATOR.IN_PROGRESS;

    return (
        <AppLayout
            ref={appLayout}
            content={
                <ContentLayout
                    header={
                        <PageHeader
                            buttonsList={[
                                <Button
                                    onClick={onEditClickAction}
                                    key={'edit-button'}
                                    data-testid="use-case-view-edit-btn"
                                    disabled={!isEditEnabled}
                                >
                                    Edit
                                </Button>,
                                <Button
                                    onClick={onCloneClickAction}
                                    key={'clone-button'}
                                    data-testid="use-case-view-clone-btn"
                                    disabled={!isCloneEnabled}
                                >
                                    Clone
                                </Button>,
                                <Button
                                    onClick={onDeleteInit}
                                    key={'delete-button'}
                                    data-testid="use-case-view-delete-btn"
                                    disabled={!isDeleteEnabled}
                                >
                                    Delete
                                </Button>
                            ]}
                            deploymentId={parseStackName(selectedDeployment.StackId)}
                        />
                    }
                >
                    <SpaceBetween size="l">
                        <General
                            loadHelpPanelContent={loadHelpPanelContent}
                            selectedDeployment={selectedDeployment}
                            runtimeConfig={runtimeConfig}
                        />
                        <Tabs tabs={tabs} ariaLabel="Resource details" />
                    </SpaceBetween>
                    <DeleteDeploymentModal
                        visible={showDeleteModal}
                        onDiscard={onDeleteDiscard}
                        onDelete={onDeleteConfirm}
                        deployment={selectedDeployment}
                    />
                </ContentLayout>
            }
            breadcrumbs={<Breadcrumbs deploymentId={parseStackName(selectedDeployment.StackId)} />}
            navigation={<Navigation onFollowHandler={onFollowNavigationHandler} />}
            tools={<ToolsContent useCaseType={selectedDeployment.UseCaseType} />}
            toolsOpen={toolsOpen}
            onToolsChange={({ detail }) => setToolsOpen(detail.open)}
            ariaLabels={appLayoutAriaLabels}
            notifications={<Notifications />}
            data-testid="use-case-view"
        />
    );
}
