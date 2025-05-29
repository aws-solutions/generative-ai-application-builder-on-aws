// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';

import { fetchAuthSession, Hub } from '@aws-amplify/core';
import { signOut, signInWithRedirect } from '@aws-amplify/auth';
import { useAuthEventHandler } from '../../hooks/use-auth-event-handler';
import { testStoreFactory } from '../utils/test-redux-store-factory';
import { BASE_RUNTIME_CONFIG } from '../utils/test-configs';

// Mock the AWS Amplify modules
vi.mock('@aws-amplify/core', () => ({
    fetchAuthSession: vi.fn(),
    Hub: {
        listen: vi.fn().mockReturnValue(() => {}) // Mock the listener cleanup function
    }
}));

vi.mock('@aws-amplify/auth', () => ({
    signOut: vi.fn(),
    signInWithRedirect: vi.fn()
}));

describe('useAuthEventHandler', () => {
    // Mock functions passed as props
    const mockCheckUser = vi.fn().mockResolvedValue(undefined);
    const mockResetUserState = vi.fn();
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup Hub.listen mock for each test
        (Hub.listen as ReturnType<typeof vi.fn>).mockReturnValue(() => {});
        addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
        vi.resetAllMocks();
        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });

    const getRenderedHook = () => {
        return testStoreFactory.renderHookWithStore(() => useAuthEventHandler(mockCheckUser, mockResetUserState));
    };

    it('should successfully get access token', async () => {
        const mockAccessToken = 'fake-access-token';
        const mockSession = {
            tokens: {
                accessToken: {
                    toString: () => mockAccessToken
                }
            }
        };

        (fetchAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

        const { result } = getRenderedHook();

        const accessToken = await (result.current as any).getAccessToken();

        expect(fetchAuthSession).toHaveBeenCalledTimes(1);
        expect(accessToken).toBe(mockAccessToken);
    });

    it('should throw error when access token is not available', async () => {
        const mockSession = {
            tokens: {
                accessToken: null
            }
        };

        (fetchAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

        const { result } = getRenderedHook();

        await expect((result.current as any).getAccessToken()).rejects.toThrow('No access token available');
    });

    it('should handle sign in redirect', async () => {
        const { result } = getRenderedHook();

        await act(async () => {
            await (result.current as any).handleSignIn();
        });

        expect(signInWithRedirect).toHaveBeenCalledTimes(1);
    });

    it('should handle sign in error', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (signInWithRedirect as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Sign in failed'));

        const { result } = getRenderedHook();

        await act(async () => {
            await (result.current as any).handleSignIn();
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error starting sign in:', expect.any(Error));
        consoleErrorSpy.mockRestore();
    });

    it('should handle sign out successfully', async () => {
        const { result } = getRenderedHook();

        await act(async () => {
            await (result.current as any).handleSignOut();
        });

        expect(signOut).toHaveBeenCalledTimes(1);
        expect(mockResetUserState).toHaveBeenCalledTimes(1);
    });

    it('should handle sign out error', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (signOut as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Sign out failed'));

        const { result } = getRenderedHook();

        await act(async () => {
            await (result.current as any).handleSignOut();
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing out:', expect.any(Error));
        expect(mockResetUserState).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('should set up storage event listener when userPoolClientId is available', () => {
        getRenderedHook();

        expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should clean up storage event listener on unmount', () => {
        const { unmount } = getRenderedHook();

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should handle LastAuthUser null storage event', async () => {
        const { result } = getRenderedHook();
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const mockUserPoolClientId = BASE_RUNTIME_CONFIG.UserPoolClientId;

        await act(async () => {
            const storageEvent = new StorageEvent('storage', {
                key: `CognitoIdentityServiceProvider.${mockUserPoolClientId}.LastAuthUser`,
                newValue: null
            });
            window.dispatchEvent(storageEvent);
        });

        expect(mockResetUserState).toHaveBeenCalled();
        expect(signOut).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('should handle accessToken null storage event', async () => {
        const { result } = getRenderedHook();
        const mockUserPoolClientId = BASE_RUNTIME_CONFIG.UserPoolClientId;

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
            const storageEvent = new StorageEvent('storage', {
                key: `CognitoIdentityServiceProvider.${mockUserPoolClientId}.testUser.accessToken`,
                newValue: null
            });
            window.dispatchEvent(storageEvent);
        });

        expect(mockResetUserState).toHaveBeenCalled();
        expect(signOut).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('should not trigger signout for non-matching storage events', async () => {
        const { result } = getRenderedHook();

        await act(async () => {
            const storageEvent = new StorageEvent('storage', {
                key: 'some-other-key',
                newValue: null
            });
            window.dispatchEvent(storageEvent);
        });

        expect(mockResetUserState).not.toHaveBeenCalled();
        expect(signOut).not.toHaveBeenCalled();
    });

    it('should handle signout error during storage event', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (signOut as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Cross-tab signout failed'));
        const mockUserPoolClientId = BASE_RUNTIME_CONFIG.UserPoolClientId;

        const { result } = getRenderedHook();

        await act(async () => {
            const storageEvent = new StorageEvent('storage', {
                key: `CognitoIdentityServiceProvider.${mockUserPoolClientId}.LastAuthUser`,
                newValue: null
            });
            window.dispatchEvent(storageEvent);
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error during cross-tab signout:', expect.any(Error));
        expect(mockResetUserState).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });
});
