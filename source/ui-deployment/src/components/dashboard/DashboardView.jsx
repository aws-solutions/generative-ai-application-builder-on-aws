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

import { useRef, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Link, Pagination, StatusIndicator, Table, SpaceBetween } from '@cloudscape-design/components';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { FullPageHeader } from '../commons';
import { Breadcrumbs, ToolsContent } from './common-components';
import { CustomAppLayout, Navigation, Notifications, TableNoMatchState } from '../commons/common-components';
import { paginationAriaLabels, deploymentTableAriaLabels, renderAriaLive } from '../../i18n-strings';
import { useColumnWidths } from '../commons/use-column-widths';
import { useLocalStorage } from '../commons/use-local-storage';
import HomeContext from '../../contexts/home.context';
import { DEFAULT_PREFERENCES, Preferences, parseStackName } from '../commons/table-config';
import { listDeployedUseCases, statusIndicatorTypeSelector } from './deployments';
import { DeleteDeploymentModal, onDeleteConfirm } from '../commons/delete-modal';
import { dateOptions } from '../useCaseDetails/common-components';
import { CFN_STACK_STATUS_INDICATOR, ERROR_MESSAGES, USECASE_TYPES } from '../../utils/constants';

function UseCaseTable({ columnDefinitions, saveWidths, loadHelpPanelContent }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [preferences, setPreferences] = useLocalStorage('Preferences', DEFAULT_PREFERENCES);

    const onDeleteInit = () => setShowDeleteModal(true);
    const onDeleteDiscard = () => setShowDeleteModal(false);

    const {
        state: { deploymentsData, reloadData, numUseCases, currentPageIndex, searchFilter, submittedSearchFilter },
        dispatch: homeDispatch
    } = useContext(HomeContext);

    const fetchData = async (isReload = false, currentPageIndex = 1, searchQuery = submittedSearchFilter) => {
        try {
            setLoading(true);

            if (deploymentsData.length === 0 || reloadData || isReload) {
                const response = await listDeployedUseCases(currentPageIndex, searchQuery);
                setDeployments(response.deployments);
                homeDispatch({
                    field: 'numUseCases',
                    value: response.numUseCases
                });
                if (response.nextPage) {
                    homeDispatch({
                        field: 'currentPageIndex',
                        value: response.nextPage - 1
                    });
                }

                homeDispatch({
                    field: 'deploymentsData',
                    value: response.deployments
                });
            } else {
                setDeployments(deploymentsData);
            }
            setLoading(false);
            homeDispatch({
                field: 'reloadData',
                value: false
            });
            homeDispatch({
                field: 'authorized',
                value: true
            });
        } catch (error) {
            if (error.message === ERROR_MESSAGES.UNAUTHORIZED) {
                homeDispatch({
                    field: 'authorized',
                    value: false
                });
            }
            console.error(error);
        }
    };

    useEffect(() => {
        fetchData(false, currentPageIndex);
    }, [reloadData]);

    const { items, collectionProps } = useCollection(deployments, {
        pagination: { pageSize: DEFAULT_PREFERENCES.pageSize },
        selection: {}
    });

    const submitNewSearch = async () => {
        homeDispatch({
            field: 'submittedSearchFilter',
            value: searchFilter
        });
        homeDispatch({
            field: 'currentPageIndex',
            value: 1
        });
        fetchData(true, 1, searchFilter);
    };

    const handleSearchKeyDown = async (key) => {
        if (key === 'Enter' && submittedSearchFilter !== searchFilter) {
            submitNewSearch();
        }
    };

    const onSearchClick = async () => {
        if (submittedSearchFilter !== searchFilter) {
            submitNewSearch();
        }
    };

    const onClearFilter = async () => {
        homeDispatch({
            field: 'searchFilter',
            value: ''
        });
        homeDispatch({
            field: 'submittedSearchFilter',
            value: ''
        });
        fetchData(true, 1, '');
    };

    const onSearchFilterChange = (value) => {
        homeDispatch({
            field: 'searchFilter',
            value: value
        });
    };

    const onPageChange = ({ detail }) => {
        homeDispatch({
            field: 'currentPageIndex',
            value: detail.currentPageIndex
        });
        fetchData(true, detail.currentPageIndex);
    };

    const onSelectionChange = ({ detail }) => {
        setSelectedItems(detail.selectedItems);
        homeDispatch({
            field: 'selectedDeployment',
            value: detail.selectedItems[0]
        });
    };

    return (
        <div>
            <Table
                {...collectionProps}
                loading={loading}
                items={items}
                onSelectionChange={onSelectionChange}
                selectedItems={selectedItems}
                columnDefinitions={columnDefinitions}
                columnDisplay={preferences.contentDisplay}
                selectionType="single"
                ariaLabels={deploymentTableAriaLabels}
                renderAriaLive={renderAriaLive}
                variant="full-page"
                stickyHeader={true}
                resizableColumns={true}
                onColumnWidthsChange={saveWidths}
                wrapLines={preferences.wrapLines}
                stripedRows={preferences.stripedRows}
                contentDensity={preferences.contentDensity}
                stickyColumns={preferences.stickyColumns}
                header={
                    <FullPageHeader
                        counter={!loading && `(${numUseCases})`}
                        onInfoLinkClick={loadHelpPanelContent}
                        selectedItems={selectedItems}
                        setSelectedItems={setSelectedItems}
                        refreshData={fetchData}
                        onDeleteInit={onDeleteInit}
                    />
                }
                loadingText="Loading deployments"
                empty={<TableNoMatchState onClearFilter={onClearFilter} />}
                filter={
                    <SpaceBetween direction="horizontal" size="xs">
                        <Input
                            placeholder="Search"
                            type="text"
                            data-testid="dashboard-search"
                            value={searchFilter}
                            onChange={({ detail }) => onSearchFilterChange(detail.value)}
                            onKeyDown={({ detail }) => handleSearchKeyDown(detail.key)}
                        />
                        <Button variant="icon" iconName="search" onClick={() => onSearchClick()}>
                            Search
                        </Button>
                    </SpaceBetween>
                }
                pagination={
                    <Pagination
                        currentPageIndex={currentPageIndex}
                        pagesCount={Math.ceil(numUseCases / DEFAULT_PREFERENCES.pageSize)}
                        onChange={onPageChange}
                        ariaLabels={paginationAriaLabels(Math.ceil(numUseCases / DEFAULT_PREFERENCES.pageSize))}
                        data-testid="dashboard-pagination"
                    />
                }
                preferences={<Preferences preferences={preferences} setPreferences={setPreferences} />}
            />

            <DeleteDeploymentModal
                visible={showDeleteModal}
                onDiscard={onDeleteDiscard}
                onDelete={onDeleteConfirm}
                deployment={selectedItems[0]}
            />
        </div>
    );
}

const createCloudfrontUrlLinkComponent = (item) => {
    if (!item.cloudFrontWebUrl || statusIndicatorTypeSelector(item.status) !== CFN_STACK_STATUS_INDICATOR.SUCCESS) {
        return <div>{'-'}</div>;
    }

    return (
        <div>
            <Link external href={`${item.cloudFrontWebUrl}`}>
                {'Open Application'}
            </Link>
        </div>
    );
};

export default function DashboardView() {
    const { dispatch: homeDispatch } = useContext(HomeContext);
    const navigate = useNavigate();
    const [toolsOpen, setToolsOpen] = useState(false);

    const handleOnDeploymentIdClick = (deploymentItem) => {
        homeDispatch({
            field: 'selectedDeployment',
            value: deploymentItem
        });
        navigate(`/deployment-details`);
    };

    const createDetailsPageLink = (item) => {
        return (
            <Button variant="link" onClick={() => handleOnDeploymentIdClick(item)}>
                {parseStackName(item.Name)}
            </Button>
        );
    };

    const displayStackStatus = (item) => {
        const cleanStatusString = (status) => {
            return status.replaceAll('_', ' ').toLowerCase();
        };
        return (
            <StatusIndicator type={statusIndicatorTypeSelector(item.status)}>
                {cleanStatusString(item.status)}
            </StatusIndicator>
        );
    };

    const rawColumns = [
        {
            id: 'name',
            cell: (item) => createDetailsPageLink(item),
            header: 'Use Case Name',
            minWidth: 160,
            isRowHeader: true
        },
        {
            id: 'stackId',
            header: 'Deployment Stack ID',
            cell: (item) => item.useCaseUUID,
            minWidth: 100
        },
        {
            id: 'useCaseType',
            header: 'Use Case Type',
            cell: (item) => item.UseCaseType ?? USECASE_TYPES.TEXT,
            minWidth: 100
        },
        {
            id: 'status',
            header: 'Application Status',
            cell: (item) => displayStackStatus(item),
            minWidth: 60
        },
        {
            id: 'dateCreated',
            header: 'Date Created',
            cell: (item) => new Date(item.CreatedDate).toLocaleDateString('en-US', dateOptions),
            minWidth: 120
        },
        {
            id: 'modelProvider',
            header: 'Model Provider',
            cell: (item) => item.LlmParams?.ModelProvider ?? 'N/A',
            minWidth: 100
        },
        {
            id: 'webUrl',
            header: 'Application Access',
            cell: (item) => createCloudfrontUrlLinkComponent(item),
            minWidth: 120
        }
    ];

    const COLUMN_DEFINITIONS = rawColumns.map((column) => ({
        ...column
    }));

    const [columnDefinitions, saveWidths] = useColumnWidths('DeploymentsDashboard-Widths', COLUMN_DEFINITIONS);

    const appLayout = useRef();

    const onFollowNavigationHandler = (event) => {
        navigate(event.detail.href);
    };

    return (
        <div>
            <CustomAppLayout
                ref={appLayout}
                navigation={<Navigation onFollowHandler={onFollowNavigationHandler} />}
                breadcrumbs={<Breadcrumbs />}
                content={
                    <UseCaseTable
                        columnDefinitions={columnDefinitions}
                        saveWidths={saveWidths}
                        loadHelpPanelContent={() => {
                            setToolsOpen(true);
                            appLayout.current?.focusToolsClose();
                        }}
                        setSelectedDeploymentStorage
                    />
                }
                contentType="table"
                tools={<ToolsContent />}
                toolsOpen={toolsOpen}
                onToolsChange={({ detail }) => setToolsOpen(detail.open)}
                notifications={<Notifications successNotification={true} />}
                stickyNotifications
                data-testid="dashboard-view"
            />
        </div>
    );
}
