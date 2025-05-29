// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * TopNavigationBar component that renders the application's top navigation bar.
 * Displays the application logo, title and user profile menu with support links and sign out option.
 * Uses Cloudscape Design System's TopNavigation component.
 */
import { TopNavigation, TopNavigationProps } from '@cloudscape-design/components';

import { useUser } from '../../contexts/UserContext';
import { DOCS_LINKS, SOLUTION_NAME } from '../../utils/constants';

export default function TopNavigationBar() {
    // Get user details and sign out function from UserContext
    const { userEmail, userName, onSignOut } = useUser();

    /**
     * Configuration object for the solution identity section of the top navigation
     * Includes the application title, logo and home link
     */
    const solutionIdentity: TopNavigationProps.Identity = {
        href: '/',
        title: SOLUTION_NAME,
        logo: {
            // Note: replace with a path to image if needed, eg, src: '/src/images/logo.png
            src: '/favicon.png',
            alt: 'Application logo'
        }
    };

    /**
     * Internationalization strings for the overflow menu
     */
    const i18nStrings: TopNavigationProps.I18nStrings = {
        overflowMenuTitleText: 'All',
        overflowMenuTriggerText: 'More'
    };

    /**
     * Configuration for the utilities section (right side) of the top navigation
     * Contains the user profile dropdown menu with support links and sign out option
     */
    const utilities: TopNavigationProps.Utility[] = [
        {
            type: 'menu-dropdown',
            iconName: 'user-profile',
            ariaLabel: 'User profile',
            text: userName || '',
            description: userEmail || '',
            items: [
                {
                    id: 'support-group',
                    text: 'Support',
                    items: [
                        {
                            id: 'documentation',
                            text: 'Documentation',
                            href: DOCS_LINKS.IG_ROOT,
                            external: true,
                            externalIconAriaLabel: ' (opens in new tab)'
                        },
                        {
                            id: 'issue',
                            text: 'Report Issue',
                            href: DOCS_LINKS.GITHUB_ISSUES_FORM,
                            external: true,
                            externalIconAriaLabel: ' (opens in new tab)'
                        }
                    ]
                },
                {
                    id: 'signout',
                    text: 'Sign out'
                }
            ],
            /**
             * Handler for menu item clicks
             * Handles sign out action when sign out option is selected
             */
            onItemClick: async (e) => {
                if (e.detail.id === 'signout') {
                    try {
                        await onSignOut();
                    } catch (error) {
                        console.error('Error signing out:', error);
                    }
                }
            }
        }
    ];

    return <TopNavigation identity={solutionIdentity} i18nStrings={i18nStrings} utilities={utilities} />;
}
