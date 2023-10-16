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
import { Button, Link, Pagination, StatusIndicator, Table, TextFilter } from '@cloudscape-design/components';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { FullPageHeader } from '../commons';
import { Breadcrumbs, ToolsContent } from './common-components';
import {
    CustomAppLayout,
    Navigation,
    Notifications,
    TableEmptyState,
    TableNoMatchState
} from '../commons/common-components';
import {
    paginationAriaLabels,
    deploymentTableAriaLabels,
    renderAriaLive,
    getTextFilterCounterText,
    getHeaderCounterText,
    createTableSortLabelFn
} from '../../i18n-strings';
import { useColumnWidths } from '../commons/use-column-widths';
import { useLocalStorage } from '../commons/use-local-storage';
import HomeContext from '../../home/home.context';
import { DEFAULT_PREFERENCES, Preferences, parseStackName } from '../commons/table-config';
import { listDeployedUseCases, statusIndicatorTypeSelector } from './deployments';
import { DeleteDeploymentModal, onDeleteConfirm } from '../commons/delete-modal';
import { dateOptions } from '../useCaseDetails/common-components';
import { CFN_STACK_STATUS_INDICATOR, ERROR_MESSAGES } from '../../utils/constants';

function UseCaseTable({ columnDefinitions, saveWidths, loadHelpPanelContent }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [, setFilteringText] = useState('');
    const [, setDelayedFilteringText] = useState('');
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [preferences, setPreferences] = useLocalStorage('Preferences', DEFAULT_PREFERENCES);

    const onDeleteInit = () => setShowDeleteModal(true);
    const onDeleteDiscard = () => setShowDeleteModal(false);

    const {
        state: { deploymentsData, reloadData },
        dispatch: homeDispatch
    } = useContext(HomeContext);

    const fetchData = async (isReload = false) => {
        try {
            setLoading(true);

            if (deploymentsData.length === 0 || reloadData || isReload) {
                const response = await listDeployedUseCases();
                setDeployments(response.deployments);
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
        fetchData();
    }, [reloadData]);

    const dateCreatedColumn = columnDefinitions.find((column) => column.id === 'dateCreated');

    const { items, actions, filteredItemsCount, collectionProps, filterProps, paginationProps } = useCollection(
        deployments,
        {
            filtering: {
                empty: <TableEmptyState resourceName="Deployment" />,
                noMatch: <TableNoMatchState onClearFilter={() => actions.setFiltering('')} />
            },
            pagination: { pageSize: preferences.pageSize },
            sorting: { defaultState: { sortingColumn: dateCreatedColumn, isDescending: true } },
            selection: {}
        }
    );

    const onClearFilter = () => {
        setFilteringText('');
        setDelayedFilteringText('');
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
                        counter={!loading && getHeaderCounterText(deployments, collectionProps.selectedItems)}
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
                    <TextFilter
                        {...filterProps}
                        filteringAriaLabel="Filter deployments"
                        filteringPlaceholder="Find deployments"
                        filteringClearAriaLabel="Clear"
                        countText={getTextFilterCounterText(filteredItemsCount)}
                    />
                }
                pagination={
                    <Pagination {...paginationProps} ariaLabels={paginationAriaLabels(filteredItemsCount.pagesCount)} />
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
            sortingField: 'Name',
            cell: (item) => createDetailsPageLink(item),
            header: 'Use Case Name',
            minWidth: 160,
            isRowHeader: true
        },
        {
            id: 'stackId',
            sortingField: 'useCaseUUID',
            header: 'Deployment Stack ID',
            cell: (item) => item.useCaseUUID,
            minWidth: 100
        },
        {
            id: 'status',
            sortingField: 'status',
            header: 'Application Status',
            cell: (item) => displayStackStatus(item),
            minWidth: 60
        },
        {
            id: 'dateCreated',
            sortingField: 'CreatedDate',
            header: 'Date Created',
            cell: (item) => new Date(item.CreatedDate).toLocaleDateString('en-US', dateOptions),
            minWidth: 120
        },
        {
            id: 'modelProvider',
            sortingField: 'ModelProvider',
            header: 'Model Provider',
            cell: (item) => item.LlmParams.ModelProvider ?? 'N/A',
            minWidth: 100
        },
        {
            id: 'webUrl',
            sortingField: 'cloudFrontWebUrl',
            header: 'Application Access',
            cell: (item) => createCloudfrontUrlLinkComponent(item),
            minWidth: 120
        }
    ];

    const COLUMN_DEFINITIONS = rawColumns.map((column) => ({
        ...column,
        ariaLabel: createTableSortLabelFn(column)
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
