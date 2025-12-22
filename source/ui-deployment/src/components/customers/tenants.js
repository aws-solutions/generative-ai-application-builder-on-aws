/* eslint-disable default-case */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from 'aws-amplify';
import { API_NAME, PLATFORM_API_ROUTES } from '../../utils/constants';
import { generateToken } from '../../utils/utils';

export async function listTenants() {
    const token = await generateToken();
    return await API.get(API_NAME, PLATFORM_API_ROUTES.LIST_TENANTS.route, {
        headers: { Authorization: token }
    });
}

export async function createTenant({ name, slug }) {
    const token = await generateToken();
    return await API.post(API_NAME, PLATFORM_API_ROUTES.CREATE_TENANT.route, {
        headers: { Authorization: token },
        body: { name, slug }
    });
}

export async function createTenantUser({ tenantId, email, role, username }) {
    const token = await generateToken();
    return await API.post(API_NAME, PLATFORM_API_ROUTES.CREATE_TENANT_USER.route(tenantId), {
        headers: { Authorization: token },
        body: { email, role, username }
    });
}


