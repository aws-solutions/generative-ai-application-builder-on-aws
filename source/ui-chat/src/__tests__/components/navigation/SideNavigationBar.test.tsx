// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from '@testing-library/react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getAppNestedPath, ROUTES } from '../../../utils/constants';
import SideNavigationBar from '../../../components/navigation/SideNavigationBar';

// Mock the required hooks
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
        useLocation: vi.fn()
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: vi.fn()
}));

describe('SideNavigationBar', () => {
    const mockNavigate = vi.fn();

    // Define the translations type
    type TranslationKeys = 'sidenav.header' | 'sidenav.chatOption';
    const translations: Record<TranslationKeys, string> = {
        'sidenav.header': 'Header Text',
        'sidenav.chatOption': 'Chat Option'
    };

    const mockTranslation = {
        t: vi.fn((key: string) => {
            return translations[key as TranslationKeys] || key;
        })
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as any).mockReturnValue(mockNavigate);
        (useLocation as any).mockReturnValue({ pathname: '/' });
        (useTranslation as any).mockReturnValue(mockTranslation);
    });

    const renderSideNav = () => {
        const { container } = render(
            <BrowserRouter>
                <SideNavigationBar />
            </BrowserRouter>
        );
        return createWrapper(container).findSideNavigation();
    };

    test('renders the side navigation component with correct header', () => {
        const wrapper = renderSideNav();
        const header = wrapper?.findHeader();

        expect(header).not.toBeNull();
        expect(mockTranslation.t).toHaveBeenCalledWith('sidenav.header');
        expect(wrapper?.findHeaderLink()?.getElement()).toHaveAttribute('href', '#/');
    });

    test('renders navigation items correctly', () => {
        const wrapper = renderSideNav();
        const firstItem = wrapper?.findItemByIndex(1);

        expect(firstItem).not.toBeNull();
        expect(mockTranslation.t).toHaveBeenCalledWith('sidenav.chatOption');
        expect(firstItem?.findLink()?.getElement()).toHaveAttribute('href', getAppNestedPath(ROUTES.APP.CHAT));
    });

    test('handles navigation when link is clicked', () => {
        const wrapper = renderSideNav();
        const link = wrapper?.findItemByIndex(1)?.findLink();
        link?.click();

        expect(mockNavigate).toHaveBeenCalledWith(getAppNestedPath(ROUTES.APP.CHAT));
    });

    test('does not navigate for external links', () => {
        const wrapper = renderSideNav();
        const link = wrapper?.findItemByIndex(0)?.findLink();
        link?.click();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('handles empty or root path correctly', () => {
        (useLocation as any).mockReturnValue({ pathname: '/' });
        const wrapper = renderSideNav();

        const headerLink = wrapper?.findHeaderLink();
        expect(headerLink?.getElement()).toHaveAttribute('href', '#/');
    });
});
