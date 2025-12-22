// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createRef, useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
    Alert,
    AppLayout,
    Button,
    ContentLayout,
    SpaceBetween,
    StatusIndicator,
    Tabs
} from '@cloudscape-design/components';

import { Navigation, Notifications } from '../commons/common-components';
import { appLayoutAriaLabels } from '../../i18n-strings';
import { ToolsContent } from '../../utils/tools-content';
import HomeContext from '../../contexts/home.context';
import { parseStackName } from '../commons/table-config';
import { DeleteDeploymentModal, onDeleteConfirm } from '../commons/delete-modal';
import { CFN_STACK_STATUS_INDICATOR, DEPLOYMENT_ACTIONS, USECASE_TYPES } from '../../utils/constants';
import { getUseCaseRoute } from '../../utils/utils';
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
import { Targets } from './targets';
import { Gateway } from './gateway';
import { Runtime } from './runtime';
import { MCPs } from './mcps';
import { AgentDetails } from './agentDetails';
import { WorkflowDetails } from './workflowDetails';
import { WorkflowOrchestration } from './workflowOrchestration';

export default function UseCaseView() {
    const { useCaseId, useCaseType } = useParams(); // Get useCaseId and useCaseType from URL params
    const {
        data: apiResponse,
        isLoading,
        isSuccess,
        error
    } = useUseCaseDetailsQuery(useCaseId, useCaseType, {
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

    const selectedDeployment = useMemo(() => {
        return isSuccess ? mapApiResponseToSelectedDeployment(apiResponse) : null;
    }, [isSuccess, apiResponse]);

    // Update context whenever fresh details arrive (details can change out-of-band, e.g. voice channel assignment)
    useEffect(() => {
        if (isSuccess && selectedDeployment) {
            homeDispatch({
                field: 'selectedDeployment',
                value: selectedDeployment
            });
        }
    }, [isSuccess, selectedDeployment, homeDispatch]);

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
        return (
            <div style={{ padding: '20px' }}>
                No deployment details found for ID: {useCaseId} (Type: {useCaseType})
            </div>
        );
    }

    const navigateDestination = getUseCaseRoute(selectedDeployment.UseCaseType);

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

    if (selectedDeployment.UseCaseType === USECASE_TYPES.AGENT_BUILDER) {
        tabs = [
            {
                label: 'Agent Details',
                id: 'agentDetails',
                content: (
                    <AgentDetails loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />
                ),
                key: 'agentDetails'
            },
            {
                label: 'Tools and Resources',
                id: 'mcps',
                content: <MCPs loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />,
                key: 'mcps'
            },
            {
                label: 'Model',
                id: 'model',
                content: <Model loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />,
                key: 'model'
            }
        ];
    }

    if (selectedDeployment.UseCaseType === USECASE_TYPES.WORKFLOW) {
        tabs = [
            {
                label: 'Workflow Configuration',
                id: 'workflowDetails',
                content: (
                    <WorkflowDetails
                        loadHelpPanelContent={loadHelpPanelContent}
                        selectedDeployment={selectedDeployment}
                    />
                ),
                key: 'workflowDetails'
            },
            {
                label: 'Multi-Agent Orchestration',
                id: 'workflowOrchestration',
                content: (
                    <WorkflowOrchestration
                        loadHelpPanelContent={loadHelpPanelContent}
                        selectedDeployment={selectedDeployment}
                    />
                ),
                key: 'workflowOrchestration'
            },
            {
                label: 'Model',
                id: 'model',
                content: <Model loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />,
                key: 'model'
            }
        ];
    }

    if (selectedDeployment.UseCaseType === USECASE_TYPES.MCP_SERVER && selectedDeployment.MCPParams?.GatewayParams) {
        tabs = [
            {
                label: 'Gateway',
                id: 'gateway',
                content: (
                    <Gateway loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />
                ),
                key: 'gateway'
            },
            {
                label: 'Targets',
                id: 'targets',
                content: (
                    <Targets loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />
                ),
                key: 'targets'
            }
        ];
    }

    if (selectedDeployment.UseCaseType === USECASE_TYPES.MCP_SERVER && selectedDeployment.MCPParams?.RuntimeParams) {
        tabs = [
            {
                label: 'Runtime',
                id: 'runtime',
                content: (
                    <Runtime loadHelpPanelContent={loadHelpPanelContent} selectedDeployment={selectedDeployment} />
                ),
                key: 'runtime'
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
