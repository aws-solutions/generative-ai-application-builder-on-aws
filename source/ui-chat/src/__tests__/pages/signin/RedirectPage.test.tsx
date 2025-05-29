// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { useUser } from '@/contexts/UserContext';
import RedirectPage from '@/pages/signin/RedirectPage';

// Mock the dependencies
vi.mock('../../../contexts/UserContext');
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        Navigate: vi.fn(() => null)
    };
});

describe('RedirectPage', () => {
    const mockUseUser = useUser as unknown as ReturnType<typeof vi.fn>;
    const mockOnSignIn = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state when isLoading is true', () => {
        mockUseUser.mockReturnValue({
            isAuthenticated: false,
            isLoading: true,
            onSignIn: mockOnSignIn
        });

        render(<RedirectPage />);
        expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('redirects to chat when user is authenticated', async () => {
        mockUseUser.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            onSignIn: mockOnSignIn
        });

        render(<RedirectPage />);
        const navigate = vi.mocked(await import('react-router-dom')).Navigate;
        expect(navigate).toHaveBeenCalledWith(
            {
                to: expect.stringContaining('/app/chat'),
                replace: true
            },
            expect.any(Object)
        );
    });

    it('shows sign in page when user is not authenticated', () => {
        mockUseUser.mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
            onSignIn: mockOnSignIn
        });

        render(<RedirectPage />);
        expect(screen.getByTestId('redirect-page-content')).toBeTruthy();
        expect(screen.getByTestId('redirect-page-content-layout-header')).toBeTruthy();
        expect(screen.getByTestId('auth-required-container-header')).toBeTruthy();
        expect(screen.getByTestId('sign-in-button')).toBeTruthy();
    });

    it('calls onSignIn when sign in button is clicked', () => {
        mockUseUser.mockReturnValue({
            isAuthenticated: false,
            isLoading: false,
            onSignIn: mockOnSignIn
        });

        render(<RedirectPage />);

        const signInButton = screen.getByTestId('sign-in-button');
        fireEvent.click(signInButton);

        expect(mockOnSignIn).toHaveBeenCalledTimes(1);
    });
});
