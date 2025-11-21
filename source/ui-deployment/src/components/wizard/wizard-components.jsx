// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import { APP_TRADEMARK_NAME, DEPLOYMENT_ACTIONS, USECASE_CONFIG } from '../../utils/constants';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import HomeContext from '../../contexts/home.context';

export const Breadcrumbs = () => {
    const navigate = useNavigate();

    const {
        state: {
            deploymentAction,
            selectedDeployment: { UseCaseType: usecaseType }
        }
    } = useContext(HomeContext);

    const breadcrumbText =
        deploymentAction.charAt(0).toUpperCase() + deploymentAction.toLowerCase().slice(1) + ' deployment';

    const displayName =
        Object.values(USECASE_CONFIG).find((config) => config.type === usecaseType)?.displayName || usecaseType;

    return (
        <BreadcrumbGroup
            expandAriaLabel="Show path"
            ariaLabel="Breadcrumbs"
            items={[
                { text: `${APP_TRADEMARK_NAME}`, href: '/' },
                { text: breadcrumbText, href: deploymentAction === DEPLOYMENT_ACTIONS.CREATE ? '/create' : '#' },
                { text: `${displayName} Use Case` }
            ]}
            onFollow={(event) => {
                event.preventDefault();
                navigate(event.detail.href);
            }}
        />
    );
};
