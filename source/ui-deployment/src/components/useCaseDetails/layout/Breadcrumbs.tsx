// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BreadcrumbGroup } from '@cloudscape-design/components';
import { useNavigate } from 'react-router-dom';

const resourcesBreadcrumbs = [
    {
        text: 'Deployments',
        href: '/'
    }
];

interface BreadcrumbsProps {
    deploymentId: string;
}

/**
 * Component that renders a breadcrumb navigation using Cloudscape BreadcrumbGroup
 * Shows a path from root to current deployment
 *
 * @param {Object} props - Component props
 * @param {string} props.deploymentId - ID of the current deployment
 * @returns {JSX.Element} Breadcrumb navigation component
 */
export const Breadcrumbs = ({ deploymentId }: BreadcrumbsProps) => {
    const navigate = useNavigate();

    return (
        <BreadcrumbGroup
            items={[
                ...resourcesBreadcrumbs,
                {
                    text: deploymentId.split('/')[0],
                    href: '#'
                }
            ]}
            expandAriaLabel="Show path"
            ariaLabel="Breadcrumbs"
            onFollow={(event) => {
                event.preventDefault();
                navigate(event.detail.href);
            }}
        />
    );
};
