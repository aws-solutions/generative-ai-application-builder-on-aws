// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useRef, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Badge,
    FormField,
    Input,
    Link,
    Modal,
    Pagination,
    Select,
    StatusIndicator,
    Table,
    SpaceBetween
} from '@cloudscape-design/components';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { FullPageHeader } from '../commons';
import { Breadcrumbs, ToolsContent } from './common-components';
import { CustomAppLayout, Navigation, Notifications, TableNoMatchState } from '../commons/common-components';
import { paginationAriaLabels, deploymentTableAriaLabels, renderAriaLive } from '../../i18n-strings';
import { useColumnWidths } from '../commons/use-column-widths';
import { useLocalStorage } from '../commons/use-local-storage';
import HomeContext from '../../contexts/home.context';
import { DEFAULT_PREFERENCES, Preferences, parseStackName } from '../commons/table-config';
import { assignVoiceChannel, listDeployedUseCases, statusIndicatorTypeSelector } from './deployments';
import { DeleteDeploymentModal, onDeleteConfirm } from '../commons/delete-modal';
import { CFN_STACK_STATUS_INDICATOR, ERROR_MESSAGES, USECASE_TYPES } from '../../utils/constants';
import { dateOptions } from '../../utils/dateUtils';
import { listTenants } from '../customers/tenants';

function UseCaseTable({ columnDefinitions, saveWidths, loadHelpPanelContent }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [voicePhoneNumber, setVoicePhoneNumber] = useState('');
    const [voiceSaving, setVoiceSaving] = useState(false);
    const [voiceError, setVoiceError] = useState('');
    const [preferences, setPreferences] = useLocalStorage('Preferences', DEFAULT_PREFERENCES);

    const onDeleteInit = () => setShowDeleteModal(true);
    const onDeleteDiscard = () => setShowDeleteModal(false);
    const onVoiceInit = () => {
        setVoiceError('');
        setVoicePhoneNumber('');
        setShowVoiceModal(true);
    };
    const onVoiceDiscard = () => {
        setVoiceError('');
        setVoicePhoneNumber('');
        setVoiceSaving(false);
        setShowVoiceModal(false);
    };

    const {
        state: { deploymentsData, reloadData, numUseCases, currentPageIndex, searchFilter, submittedSearchFilter },
        dispatch: homeDispatch
    } = useContext(HomeContext);

    const [tenantOptions, setTenantOptions] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState(null);

    const fetchData = async (
        isReload = false,
        currentPageIndex = 1,
        searchQuery = submittedSearchFilter,
        tenantId = selectedTenant?.value
    ) => {
        try {
            setLoading(true);

            if (deploymentsData.length === 0 || reloadData || isReload) {
                const response = await listDeployedUseCases(currentPageIndex, searchQuery, tenantId);
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

    useEffect(() => {
        // Load tenants for filter dropdown
        listTenants()
            .then((resp) => {
                const items = resp?.items ?? [];
                setTenantOptions(
                    items.map((t) => ({
                        label: t.name ?? t.tenantId,
                        value: t.tenantId,
                        description: t.slug ? `slug: ${t.slug}` : undefined
                    }))
                );
            })
            .catch(() => setTenantOptions([]));
    }, []);

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
        fetchData(true, 1, searchFilter, selectedTenant?.value);
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
        setSelectedTenant(null);
        fetchData(true, 1, '', undefined);
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
        fetchData(true, detail.currentPageIndex, submittedSearchFilter, selectedTenant?.value);
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
                data-testid="dashboard-view-table"
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
                        extraActions={
                            <Button
                                disabled={
                                    selectedItems.length !== 1 ||
                                    !selectedItems[0]?.TenantId ||
                                    statusIndicatorTypeSelector(selectedItems[0]?.status) !== CFN_STACK_STATUS_INDICATOR.SUCCESS
                                }
                                onClick={onVoiceInit}
                            >
                                Add Voice Channel
                            </Button>
                        }
                    />
                }
                loadingText="Loading deployments"
                empty={<TableNoMatchState onClearFilter={onClearFilter} />}
                filter={
                    <SpaceBetween direction="horizontal" size="xs">
                        <Select
                            placeholder="Filter by customer"
                            selectedOption={selectedTenant ?? undefined}
                            onChange={({ detail }) => {
                                setSelectedTenant(detail.selectedOption);
                                // Reset to page 1 when changing tenant filter
                                homeDispatch({ field: 'currentPageIndex', value: 1 });
                                fetchData(true, 1, submittedSearchFilter, detail.selectedOption?.value);
                            }}
                            options={tenantOptions}
                            filteringType="auto"
                        />
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

            {selectedItems?.[0] && (
                <Modal
                    visible={showVoiceModal}
                    onDismiss={onVoiceDiscard}
                    header="Add Voice Channel (Amazon Connect)"
                    closeAriaLabel="Close dialog"
                    footer={
                        <Box float="right">
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button variant="link" onClick={onVoiceDiscard}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    disabled={voiceSaving || !voicePhoneNumber.trim()}
                                    onClick={async () => {
                                        setVoiceSaving(true);
                                        setVoiceError('');
                                        try {
                                            await assignVoiceChannel(selectedItems[0].UseCaseId, voicePhoneNumber.trim());
                                            // Refresh list so the Voice Phone Number column updates after assignment
                                            await fetchData();
                                            onVoiceDiscard();
                                        } catch (e) {
                                            setVoiceError(e?.message ?? 'Failed to assign phone number');
                                            setVoiceSaving(false);
                                        }
                                    }}
                                >
                                    Save
                                </Button>
                            </SpaceBetween>
                        </Box>
                    }
                >
                    <SpaceBetween size="m">
                        {voiceError ? (
                            <Box color="text-status-error" variant="p">
                                {voiceError}
                            </Box>
                        ) : null}
                        <Box variant="p">
                            Assign an E.164 phone number (e.g. <b>+14155550123</b>) to route Amazon Connect calls to this
                            deployment.
                        </Box>
                        <FormField label="Phone number (E.164)">
                            <Input
                                value={voicePhoneNumber}
                                onChange={({ detail }) => setVoicePhoneNumber(detail.value)}
                                placeholder="+14155550123"
                            />
                        </FormField>
                    </SpaceBetween>
                </Modal>
            )}
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

const enabledChannelsBadges = (item) => {
    const channels = [];
    if (item?.cloudFrontWebUrl) channels.push({ label: 'Web', color: 'blue' });
    if (item?.VoicePhoneNumber?.trim?.()) channels.push({ label: 'Voice', color: 'green' });
    if (channels.length === 0) return '-';
    return (
        <SpaceBetween direction="horizontal" size="xs">
            {channels.map((c) => (
                <Badge key={c.label} color={c.color}>
                    {c.label}
                </Badge>
            ))}
        </SpaceBetween>
    );
};

export default function DashboardView() {
    const navigate = useNavigate();
    const [toolsOpen, setToolsOpen] = useState(false);

    const handleOnDeploymentIdClick = (deploymentItem) => {
        const useCaseType = deploymentItem.UseCaseType ?? USECASE_TYPES.TEXT;
        navigate(`/deployment-details/${useCaseType}/${deploymentItem.UseCaseId}`);
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
            if (!status || typeof status !== 'string') return 'unknown';
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
            id: 'tenant',
            header: 'Customer / Tenant',
            cell: (item) => item?.TenantId ?? '',
            minWidth: 160
        },
        {
            id: 'channels',
            header: 'Enabled Channels',
            cell: (item) => enabledChannelsBadges(item),
            minWidth: 140
        },
        {
            id: 'voicePhoneNumber',
            header: 'Voice Number',
            cell: (item) => item?.VoicePhoneNumber?.trim?.() ? item.VoicePhoneNumber : '-',
            minWidth: 140
        },
        {
            id: 'stackId',
            header: 'Use Case ID',
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
            cell: (item) => item?.ModelProvider ?? 'N/A',
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
