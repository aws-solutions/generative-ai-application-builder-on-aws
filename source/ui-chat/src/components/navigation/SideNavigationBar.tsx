// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SideNavigation, SideNavigationProps } from '@cloudscape-design/components';
import { NavigateFunction, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAppNestedPath, ROUTES } from '../../utils/constants';

/**
 * SideNavigationBar component provides a navigation sidebar for the application.
 * It handles navigation state, routing, and displays navigation items.
 *
 * @returns {JSX.Element} A SideNavigation component with configured header, active state, and navigation items
 */
export default function SideNavigationBar() {
    const navigate: NavigateFunction = useNavigate();
    const { t } = useTranslation();
    const [activeHref, setActiveHref] = useState('/');

    const navigationItems: SideNavigationProps['items'] = [
        { type: 'link', text: t('sidenav.chatOption'), href: getAppNestedPath(`${ROUTES.APP.CHAT}`) }
    ];

    /**
     * Handles navigation when a link is clicked
     * Prevents default behavior for internal links and updates navigation
     *
     * @param {Readonly<CustomEvent>} event - The navigation event containing href details
     */
    const handleFollow = useCallback(
        (event: Readonly<CustomEvent>): void => {
            if (event.detail.external || !event.detail.href) return;

            event.preventDefault();

            const path = event.detail.href;
            navigate(path);
        },
        [navigate]
    );

    const location = useLocation();
    /**
     * Updates the active href state when location changes
     * Extracts the top-level path from the current location
     */
    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const topLevelPath = pathParts.length > 1 ? `/${pathParts[1]}` : '/';
        setActiveHref(topLevelPath);
    }, [location]);

    const navHeader: SideNavigationProps.Header = {
        href: '#/',
        text: t('sidenav.header')
    };

    return (
        <SideNavigation header={navHeader} activeHref={activeHref} onFollow={handleFollow} items={navigationItems} />
    );
}
