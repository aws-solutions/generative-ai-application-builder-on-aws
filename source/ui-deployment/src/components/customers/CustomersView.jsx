// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    FormField,
    Header,
    Input,
    Modal,
    Select,
    SpaceBetween,
    Table
} from '@cloudscape-design/components';
import { useCollection } from '@cloudscape-design/collection-hooks';
import HomeContext from '../../contexts/home.context';
import { Breadcrumbs } from '../dashboard/common-components';
import { CustomAppLayout, Navigation, Notifications, TableNoMatchState } from '../commons/common-components';
import { useColumnWidths } from '../commons/use-column-widths';
import { useLocalStorage } from '../commons/use-local-storage';
import { DEFAULT_PREFERENCES, Preferences } from '../commons/table-config';
import { ERROR_MESSAGES } from '../../utils/constants';
import { listTenants, createTenant, createTenantUser } from './tenants';

const CUSTOMER_CONTENT_DISPLAY_OPTIONS = [
    { id: 'tenantId', label: 'Tenant ID', alwaysVisible: true },
    { id: 'name', label: 'Name', alwaysVisible: true },
    { id: 'slug', label: 'Slug' },
    { id: 'status', label: 'Status' },
    { id: 'createdAt', label: 'Created At' }
];

function CreateTenantModal({ visible, onDismiss, onCreated }) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const reset = () => {
        setName('');
        setSlug('');
        setSaving(false);
        setError('');
    };

    const onClose = () => {
        reset();
        onDismiss();
    };

    const onCreate = async () => {
        setSaving(true);
        setError('');
        try {
            await createTenant({ name, slug });
            onCreated();
            onClose();
        } catch (e) {
            setError(e?.message ?? 'Failed to create customer');
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            onDismiss={onClose}
            header="Create customer"
            closeAriaLabel="Close dialog"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={onCreate}
                            disabled={saving || !name.trim() || !slug.trim()}
                        >
                            Create
                        </Button>
                    </SpaceBetween>
                </Box>
            }
        >
            <SpaceBetween size="m">
                {error ? (
                    <Box color="text-status-error" variant="p">
                        {error}
                    </Box>
                ) : null}
                <FormField label="Name">
                    <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="Acme Inc" />
                </FormField>
                <FormField label="Slug">
                    <Input
                        value={slug}
                        onChange={({ detail }) => setSlug(detail.value)}
                        placeholder="acme"
                        description="Lowercase identifier used for URLs and internal routing."
                    />
                </FormField>
            </SpaceBetween>
        </Modal>
    );
}

function InviteUserModal({ visible, onDismiss, tenant, onInvited }) {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [usernameTouched, setUsernameTouched] = useState(false);
    const [role, setRole] = useState({ label: 'Customer admin', value: 'customer_admin' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const deriveUsernameFromEmail = (e) => {
        const raw = String(e ?? '').trim();
        const local = raw.includes('@') ? raw.split('@')[0] : raw;
        // keep it simple and safe; backend will also sanitize/validate
        return local.toLowerCase();
    };

    const reset = () => {
        setEmail('');
        setUsername('');
        setUsernameTouched(false);
        setRole({ label: 'Customer admin', value: 'customer_admin' });
        setSaving(false);
        setError('');
    };

    const onClose = () => {
        reset();
        onDismiss();
    };

    const onInvite = async () => {
        setSaving(true);
        setError('');
        try {
            await createTenantUser({
                tenantId: tenant.tenantId,
                email,
                role: role.value,
                username: username?.trim() ? username.trim() : undefined
            });
            onInvited();
            onClose();
        } catch (e) {
            setError(e?.message ?? 'Failed to invite user');
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            onDismiss={onClose}
            header={`Invite user${tenant?.name ? ` to ${tenant.name}` : ''}`}
            closeAriaLabel="Close dialog"
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={onInvite} disabled={saving || !email.trim()}>
                            Invite
                        </Button>
                    </SpaceBetween>
                </Box>
            }
        >
            <SpaceBetween size="m">
                {error ? (
                    <Box color="text-status-error" variant="p">
                        {error}
                    </Box>
                ) : null}
                <FormField label="Email">
                    <Input
                        value={email}
                        onChange={({ detail }) => {
                            const nextEmail = detail.value;
                            setEmail(nextEmail);
                            if (!usernameTouched) {
                                setUsername(deriveUsernameFromEmail(nextEmail));
                            }
                        }}
                        placeholder="user@customer.com"
                    />
                </FormField>
                <FormField
                    label="Username"
                    description="Defaults to the email prefix (before @). Users can still sign in with email."
                >
                    <Input
                        value={username}
                        onChange={({ detail }) => {
                            setUsername(detail.value);
                            setUsernameTouched(true);
                        }}
                        placeholder="username"
                    />
                </FormField>
                <FormField label="Role">
                    <Select
                        selectedOption={role}
                        onChange={({ detail }) => setRole(detail.selectedOption)}
                        options={[
                            { label: 'Customer admin', value: 'customer_admin' },
                            { label: 'Customer user', value: 'customer_user' }
                        ]}
                    />
                </FormField>
            </SpaceBetween>
        </Modal>
    );
}

export default function CustomersView() {
    const navigate = useNavigate();
    const appLayout = useRef();
    const [toolsOpen, setToolsOpen] = useState(false);

    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const [searchFilter, setSearchFilter] = useState('');
    const [submittedSearchFilter, setSubmittedSearchFilter] = useState('');

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    const [preferences, setPreferences] = useLocalStorage('Customers-Preferences', {
        ...DEFAULT_PREFERENCES,
        contentDisplay: CUSTOMER_CONTENT_DISPLAY_OPTIONS.map(({ id, alwaysVisible }) => ({
            id,
            visible: alwaysVisible ? true : true
        }))
    });

    const rawColumns = [
        {
            id: 'tenantId',
            header: 'Tenant ID',
            cell: (item) => item.tenantId,
            minWidth: 160,
            isRowHeader: true
        },
        {
            id: 'name',
            header: 'Name',
            cell: (item) => item.name,
            minWidth: 220
        },
        {
            id: 'slug',
            header: 'Slug',
            cell: (item) => item.slug ?? '',
            minWidth: 120
        },
        {
            id: 'status',
            header: 'Status',
            cell: (item) => item.status ?? 'UNKNOWN',
            minWidth: 80
        },
        {
            id: 'createdAt',
            header: 'Created At',
            cell: (item) => (item.createdAt ? new Date(item.createdAt).toLocaleString() : ''),
            minWidth: 160
        }
    ];

    const [columnDefinitions, saveWidths] = useColumnWidths('Customers-Widths', rawColumns);

    const { dispatch: homeDispatch } = useContext(HomeContext);

    const refresh = async () => {
        setLoading(true);
        try {
            const resp = await listTenants();
            const items = resp.items ?? [];
            setTenants(items);
            homeDispatch({ field: 'authorized', value: true });
        } catch (error) {
            if (error?.message === ERROR_MESSAGES.UNAUTHORIZED) {
                homeDispatch({ field: 'authorized', value: false });
            }
            throw error;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh().catch(() => {});
    }, []);

    const filteredTenants = submittedSearchFilter
        ? tenants.filter((t) => {
              const q = submittedSearchFilter.toLowerCase();
              return (
                  String(t.tenantId ?? '').toLowerCase().includes(q) ||
                  String(t.name ?? '').toLowerCase().includes(q) ||
                  String(t.slug ?? '').toLowerCase().includes(q)
              );
          })
        : tenants;

    const { items, collectionProps } = useCollection(filteredTenants, {
        pagination: { pageSize: preferences.pageSize },
        selection: {}
    });

    const onFollowNavigationHandler = (event) => {
        navigate(event.detail.href);
    };

    const submitNewSearch = async () => {
        setSubmittedSearchFilter(searchFilter);
    };

    const onClearFilter = () => {
        setSearchFilter('');
        setSubmittedSearchFilter('');
    };

    const selectedTenant = selectedItems?.[0];

    return (
        <CustomAppLayout
            ref={appLayout}
            navigation={<Navigation onFollowHandler={onFollowNavigationHandler} />}
            breadcrumbs={<Breadcrumbs />}
            contentType="table"
            toolsOpen={toolsOpen}
            onToolsChange={({ detail }) => setToolsOpen(detail.open)}
            notifications={<Notifications successNotification={true} />}
            stickyNotifications
            content={
                <div>
                    <Header
                        variant="awsui-h1-sticky"
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button variant="icon" iconName="refresh" onClick={refresh} />
                                <Button
                                    disabled={selectedItems.length !== 1}
                                    onClick={() => setInviteModalOpen(true)}
                                >
                                    Invite user
                                </Button>
                                <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                                    Create customer
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        Customers
                    </Header>

                    <Table
                        {...collectionProps}
                        loading={loading}
                        selectionType="single"
                        selectedItems={selectedItems}
                        onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
                        columnDefinitions={columnDefinitions}
                        columnDisplay={preferences.contentDisplay}
                        items={items}
                        wrapLines={preferences.wrapLines}
                        stripedRows={preferences.stripedRows}
                        contentDensity={preferences.contentDensity}
                        stickyColumns={preferences.stickyColumns}
                        resizableColumns
                        onColumnWidthsChange={({ detail }) => saveWidths(detail.widths)}
                        header={
                            <Box padding={{ horizontal: 's' }} paddingTop="s">
                                <SpaceBetween size="s" direction="vertical">
                                    <SpaceBetween size="s" direction="horizontal">
                                        <Box>
                                            <FormField label="Search">
                                                <Input
                                                    value={searchFilter}
                                                    onChange={({ detail }) => setSearchFilter(detail.value)}
                                                    onKeyDown={({ detail }) => {
                                                        if (detail.key === 'Enter') submitNewSearch();
                                                    }}
                                                    placeholder="Search by tenant id, name, or slug"
                                                />
                                            </FormField>
                                        </Box>
                                        <SpaceBetween size="xs" direction="horizontal">
                                            <Button onClick={submitNewSearch}>Search</Button>
                                            <Button variant="link" onClick={onClearFilter}>
                                                Clear
                                            </Button>
                                        </SpaceBetween>
                                    </SpaceBetween>
                                </SpaceBetween>
                            </Box>
                        }
                        empty={<TableNoMatchState onClearFilter={onClearFilter} />}
                        preferences={
                            <Preferences
                                preferences={preferences}
                                setPreferences={setPreferences}
                                contentDisplayOptions={CUSTOMER_CONTENT_DISPLAY_OPTIONS}
                            />
                        }
                    />

                    <CreateTenantModal
                        visible={createModalOpen}
                        onDismiss={() => setCreateModalOpen(false)}
                        onCreated={() => refresh()}
                    />
                    <InviteUserModal
                        visible={inviteModalOpen}
                        onDismiss={() => setInviteModalOpen(false)}
                        tenant={selectedTenant}
                        onInvited={() => {}}
                    />
                </div>
            }
        />
    );
}


