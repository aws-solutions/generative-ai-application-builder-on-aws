// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { UserProvider, useUser } from '../../contexts/UserContext';
import { createTestWrapper } from '../utils/test-utils';
import { getCurrentUser, fetchUserAttributes } from '@aws-amplify/auth';
import { testStoreFactory } from '../utils/test-redux-store-factory';
import { Provider } from 'react-redux';

// Mock the auth functions
vi.mock('@aws-amplify/auth', () => ({
    getCurrentUser: vi.fn(),
    fetchUserAttributes: vi.fn()
}));

describe('UserContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useUser', () => {
        it('should throw error when used outside of UserProvider', () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

            expect(() => {
                renderHook(() => useUser());
            }).toThrow('useUser must be used within a UserProvider');

            consoleError.mockRestore();
        });

        it('should provide user context when used within wrapper', () => {
            const { result } = renderHook(() => useUser(), {
                wrapper: createTestWrapper()
            });

            expect(result.current).toEqual({
                isAuthenticated: true,
                isLoading: false,
                userName: 'Test User',
                userEmail: 'test@example.com',
                authUser: {
                    userId: 'test-user-id',
                    username: 'Test User'
                },
                userId: 'test-user-id',
                onSignIn: expect.any(Function),
                onSignOut: expect.any(Function),
                getAccessToken: expect.any(Function)
            });
        });

        it('should return custom values when provided', () => {
            const customOptions = {
                userId: 'custom-id',
                userName: 'Custom User',
                userEmail: 'custom@example.com',
                isAuthenticated: false,
                isLoading: true
            };

            const { result } = renderHook(() => useUser(), {
                wrapper: createTestWrapper(customOptions)
            });

            expect(result.current).toEqual({
                isAuthenticated: false,
                isLoading: true,
                userName: 'Custom User',
                userEmail: 'custom@example.com',
                authUser: {
                    userId: 'custom-id',
                    username: 'Custom User'
                },
                userId: 'custom-id',
                onSignIn: expect.any(Function),
                onSignOut: expect.any(Function),
                getAccessToken: expect.any(Function)
            });
        });

        it('should provide working auth methods', async () => {
            const { result } = renderHook(() => useUser(), {
                wrapper: createTestWrapper()
            });

            await expect(result.current.onSignIn()).resolves.toBeUndefined();
            await expect(result.current.onSignOut()).resolves.toBeUndefined();
            await expect(result.current.getAccessToken()).resolves.toBe('mock-token');
        });
    });

    describe('UserProvider', () => {
        // Create a wrapper that provides both Redux store and UserProvider
        const createWrapper = (stateOverrides = {}) => {
            const store = testStoreFactory.createStore(stateOverrides);
            return ({ children }: { children: React.ReactNode }) => (
                <Provider store={store}>
                    <UserProvider>{children}</UserProvider>
                </Provider>
            );
        };

        const mockGetCurrentUser = vi.mocked(getCurrentUser);
        const mockFetchUserAttributes = vi.mocked(fetchUserAttributes);

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should initialize with default values', () => {
            const { result } = renderHook(() => useUser(), {
                wrapper: createTestWrapper()
            });

            expect(result.current).toMatchObject({
                isAuthenticated: true,
                isLoading: false,
                userName: 'Test User',
                userEmail: 'test@example.com'
            });
        });

        it('should handle loading state', () => {
            const { result } = renderHook(() => useUser(), {
                wrapper: createTestWrapper({ isLoading: true })
            });

            expect(result.current.isLoading).toBe(true);
        });

        it('should handle unauthenticated state', () => {
            const { result } = renderHook(() => useUser(), {
                wrapper: createTestWrapper({ isAuthenticated: false })
            });

            expect(result.current.isAuthenticated).toBe(false);
        });

        it('should check user authentication on mount', async () => {
            const mockUser = {
                userId: 'test-user-id',
                username: 'test-user'
            };
            const mockAttributes = {
                name: 'Test User',
                email: 'test@example.com'
            };

            mockGetCurrentUser.mockResolvedValue(mockUser);
            mockFetchUserAttributes.mockResolvedValue(mockAttributes);

            const { result } = renderHook(() => useUser(), {
                wrapper: createWrapper()
            });

            // Initial loading state
            expect(result.current.isLoading).toBe(true);
            expect(result.current.isAuthenticated).toBe(false);

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Final authenticated state
            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.userName).toBe(mockAttributes.name);
            expect(result.current.userEmail).toBe(mockAttributes.email);
            expect(result.current.authUser).toEqual(mockUser);
        });

        it('should handle authentication failure on mount', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGetCurrentUser.mockRejectedValue(new Error('UserUnAuthenticatedException'));

            const { result } = renderHook(() => useUser(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.userName).toBeNull();
            expect(result.current.userEmail).toBeNull();
            expect(result.current.authUser).toBeNull();

            consoleError.mockRestore();
        });

        it('should handle user attributes fetch failure', async () => {
            const mockUser = {
                userId: 'test-user-id',
                username: 'test-user'
            };
            const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

            mockGetCurrentUser.mockResolvedValue(mockUser);
            mockFetchUserAttributes.mockRejectedValue(new Error('Failed to fetch attributes'));

            const { result } = renderHook(() => useUser(), {
                wrapper: createWrapper()
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.userName).toBe(mockUser.username);
            expect(result.current.userEmail).toBeNull();
            expect(result.current.authUser).toEqual(mockUser);
            expect(consoleWarn).toHaveBeenCalled();

            consoleWarn.mockRestore();
        });
    });

    describe('Context value stability', () => {
        it('should maintain stable reference to auth methods', () => {
            const { result, rerender } = renderHook(() => useUser(), {
                wrapper: createTestWrapper()
            });

            const initialOnSignIn = result.current.onSignIn;
            const initialOnSignOut = result.current.onSignOut;
            const initialGetAccessToken = result.current.getAccessToken;

            rerender();

            expect(result.current.onSignIn).toBe(initialOnSignIn);
            expect(result.current.onSignOut).toBe(initialOnSignOut);
            expect(result.current.getAccessToken).toBe(initialGetAccessToken);
        });
    });
});
