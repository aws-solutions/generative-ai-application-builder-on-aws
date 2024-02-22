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
 *********************************************************************************************************************/

import { createRef, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppLayout, Button, Container, ContentLayout, Header, SpaceBetween, Tabs } from '@cloudscape-design/components';

import { Breadcrumbs, GeneralConfig, PageHeader, ModelDetails, KnowledgeBaseDetails } from './common-components';
import { Navigation, InfoLink, Notifications } from '../commons/common-components';
import { appLayoutAriaLabels } from '../../i18n-strings';
import { ToolsContent } from './tools-content';
import HomeContext from '../../contexts/home.context';
import { parseStackName } from '../commons/table-config';
import { DeleteDeploymentModal, onDeleteConfirm } from '../commons/delete-modal';
import { CFN_STACK_STATUS_INDICATOR, DEPLOYMENT_ACTIONS } from '../../utils/constants';
import { statusIndicatorTypeSelector } from '../dashboard/deployments';

const Model = ({ loadHelpPanelContent }) => (
    <Container
        header={
            <Header
                variant="h2"
                info={
                    <InfoLink
                        onFollow={() => loadHelpPanelContent(1)}
                        ariaLabel={'Information about deployment model.'}
                    />
                }
            >
                Model
            </Header>
        }
    >
        <ModelDetails isInProgress={true} />
    </Container>
);

const KnowledgeBase = ({ loadHelpPanelContent }) => (
    <Container
        header={
            <Header
                variant="h2"
                info={
                    <InfoLink
                        onFollow={() => loadHelpPanelContent(1)}
                        ariaLabel={'Information about deployment knowledge base.'}
                    />
                }
            >
                Knowledge base
            </Header>
        }
    >
        <KnowledgeBaseDetails isInProgress={true} />
    </Container>
);

export default function UseCaseView() {
    const {
        state: { selectedDeployment },
        dispatch: homeDispatch
    } = useContext(HomeContext);
    const navigate = useNavigate();

    const appLayout = createRef();
    const [toolsOpen, setToolsOpen] = useState(false);
    const [, setToolsIndex] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const onDeleteInit = () => setShowDeleteModal(true);
    const onDeleteDiscard = () => setShowDeleteModal(false);

    function loadHelpPanelContent(index) {
        setToolsIndex(index);
        setToolsOpen(true);
        appLayout.current?.focusToolsClose();
    }

    const tabs = [
        {
            label: 'Model',
            id: 'model',
            content: <Model loadHelpPanelContent={loadHelpPanelContent} />,
            key: 'model'
        },
        {
            label: 'Knowledge base',
            id: 'knowledgeBase',
            content: <KnowledgeBase loadHelpPanelContent={loadHelpPanelContent} />,
            key: 'knowledgeBase'
        }
    ];
  
    const onEditClickAction = () => {
        homeDispatch({
            field: 'selectedDeployment',
            value: selectedDeployment
        });
        homeDispatch({
            field: 'deploymentAction',
            value: DEPLOYMENT_ACTIONS.EDIT
        });
        navigate(`/wizardView`);
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
        navigate(`/wizardView`);
    }

    const onFollowNavigationHandler = (event) => {
        navigate(event.detail.href);
    };

    const currentDeploymentStatus = statusIndicatorTypeSelector(selectedDeployment.status);
    const isEditEnabled =
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.SUCCESS ||
        currentDeploymentStatus === CFN_STACK_STATUS_INDICATOR.WARNING;

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
                                >
                                    Clone
                                </Button>,
                                <Button onClick={onDeleteInit} key={'delete-button'}>
                                    Delete
                                </Button>
                            ]}
                            deploymentId={parseStackName(selectedDeployment.StackId)}
                        />
                    }
                >
                    <SpaceBetween size="l">
                        <GeneralConfig />
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
            tools={<ToolsContent />}
            toolsOpen={toolsOpen}
            onToolsChange={({ detail }) => setToolsOpen(detail.open)}
            ariaLabels={appLayoutAriaLabels}
            notifications={<Notifications />}
            data-testid="use-case-view"
        />
    );
}
