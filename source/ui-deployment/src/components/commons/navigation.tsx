// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';

const navHeader = { text: 'Generative AI Application Builder', href: '#/' };
export const navItems: SideNavigationProps['items'] = [
    {
        type: 'section',
        text: 'Deployments',
        items: [
            { type: 'link', text: 'All Deployments', href: '/' },
            { type: 'link', text: 'Deploy New Use Case', href: '/create' }
        ]
    },
    {
        type: 'section',
        text: 'Platform',
        items: [{ type: 'link', text: 'Customers', href: '/customers' }]
    }
];

const defaultOnFollowHandler: SideNavigationProps['onFollow'] = (event) => {
    // keep the locked href for our demo pages
    event.preventDefault();
};

interface NavigationProps {
    activeHref?: string;
    header?: SideNavigationProps['header'];
    items?: SideNavigationProps['items'];
    onFollowHandler?: SideNavigationProps['onFollow'];
}

export function Navigation({
    activeHref,
    header = navHeader,
    items = navItems,
    onFollowHandler = defaultOnFollowHandler
}: NavigationProps) {
    return <SideNavigation items={items} header={header} activeHref={activeHref} onFollow={onFollowHandler} />;
}
