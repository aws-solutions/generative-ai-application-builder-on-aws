// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi } from 'vitest';
import { testStoreFactory } from '../../utils/test-redux-store-factory';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { createTestWrapper } from '../../utils/test-utils';
import TopNavigationBar from '../../../components/navigation/TopNavigationBar';
import { DOCS_LINKS } from '../../../utils/constants';

describe('TopNavigationBar', () => {
    const renderWithProviders = (ui: React.ReactElement, userContextOptions = {}, storeOverrides = {}) => {
        const TestWrapper = createTestWrapper(userContextOptions);
        return testStoreFactory.renderWithStore(<TestWrapper>{ui}</TestWrapper>, storeOverrides);
    };

    test('renders basic navigation elements correctly', () => {
        const { container } = renderWithProviders(<TopNavigationBar />);
        const topNav = createWrapper(container).findTopNavigation();

        const identityLink = topNav!.findIdentityLink();
        expect(identityLink.getElement()).toHaveAttribute('href', '/');

        const title = topNav!.findTitle();
        expect(title?.getElement()).toHaveTextContent('Generative AI Application Builder on AWS');

        const logo = topNav!.findLogo();
        expect(logo?.getElement()).toHaveAttribute('src', '/favicon.png');
        expect(logo?.getElement()).toHaveAttribute('alt', 'Application logo');
    });

    test('renders user profile utility correctly', () => {
        const { container } = renderWithProviders(<TopNavigationBar />, {
            userName: 'John Doe',
            userEmail: 'john@example.com'
        });

        const topNav = createWrapper(container).findTopNavigation();

        const utilities = topNav!.findUtilities();
        expect(utilities).toHaveLength(1);

        const userProfile = utilities[0].findMenuDropdownType();
        expect(userProfile).not.toBeNull();

        // Open the dropdown to access its content
        userProfile!.openDropdown();

        expect(userProfile!.findDescription()?.getElement()).toHaveTextContent('john@example.com');
    });

    test('renders support menu items correctly', () => {
        const { container } = renderWithProviders(<TopNavigationBar />);
        const topNav = createWrapper(container).findTopNavigation();

        const utilities = topNav!.findUtilities();
        const userProfile = utilities[0].findMenuDropdownType();
        expect(userProfile).not.toBeNull();

        userProfile!.openDropdown();

        const items = userProfile?.findItems();
        expect(items).toHaveLength(3);

        const dropdown = userProfile!.findOpenDropdown();
        expect(dropdown).not.toBeNull();

        const docItem = userProfile!.findItemById('documentation');
        expect(docItem?.getElement()).toHaveTextContent('Documentation');
        expect(docItem?.getElement().innerHTML).toContain(DOCS_LINKS.IG_ROOT);

        const issueItem = userProfile!.findItemById('issue');
        expect(issueItem?.getElement()).toHaveTextContent('Report Issue');
        expect(issueItem?.getElement().innerHTML).toContain(DOCS_LINKS.GITHUB_ISSUES_FORM);
    });

    test('handles sign out correctly', () => {
        const mockOnSignOut = vi.fn();
        const { container } = renderWithProviders(<TopNavigationBar />, {
            onSignOut: mockOnSignOut
        });
        const topNav = createWrapper(container).findTopNavigation();

        const utilities = topNav!.findUtilities();
        const userProfile = utilities[0].findMenuDropdownType();
        expect(userProfile).not.toBeNull();

        userProfile!.openDropdown();

        const signOutItem = userProfile!.findItemById('signout');
        expect(signOutItem?.getElement()).toHaveTextContent('Sign out');

        signOutItem?.click();

        expect(mockOnSignOut).toHaveBeenCalled();
    });

    test('handles sign out error gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const mockOnSignOut = vi.fn().mockRejectedValueOnce(new Error('Sign out failed'));

        const { container } = renderWithProviders(<TopNavigationBar />, {
            onSignOut: mockOnSignOut
        });

        const topNav = createWrapper(container).findTopNavigation();

        const utilities = topNav!.findUtilities();
        const userProfile = utilities[0].findMenuDropdownType();
        expect(userProfile).not.toBeNull();

        userProfile!.openDropdown();

        const signOutItem = userProfile!.findItemById('signout');
        expect(signOutItem?.getElement()).toHaveTextContent('Sign out');

        await signOutItem?.click();

        expect(mockOnSignOut).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Error signing out:', expect.any(Error));

        consoleSpy.mockRestore();
    });
});
