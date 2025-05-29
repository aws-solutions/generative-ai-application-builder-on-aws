// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { AuthUser } from 'aws-amplify/auth';
import { useUserState } from '../../hooks/use-user-state';
import { testStoreFactory } from '../utils/test-redux-store-factory';

describe('useUserState', () => {
    it('should initialize with default values', () => {
        const { result } = testStoreFactory.renderHookWithStore(() => useUserState());

        expect(result.current as any).toEqual({
            states: {
                isAuthenticated: false,
                isLoading: true,
                userName: null,
                userId: '',
                userEmail: null,
                authUser: null
            },
            setters: expect.any(Object),
            resetUserState: expect.any(Function)
        });
    });

    it('should update authentication state', () => {
        const { result } = testStoreFactory.renderHookWithStore(() => useUserState());

        act(() => {
            (result.current as any as any).setters.setIsAuthenticated(true);
        });

        expect((result.current as any as any).states.isAuthenticated).toBe(true);
    });

    it('should update user information', () => {
        const { result } = testStoreFactory.renderHookWithStore(() => useUserState());
        const mockUser = {
            username: 'testUser',
            userId: 'user123',
            email: 'test@example.com'
        };

        act(() => {
            (result.current as any).setters.setUserName(mockUser.username);
            (result.current as any).setters.setUserEmail(mockUser.email);
            (result.current as any).setters.setUserId(mockUser.userId);
        });

        expect((result.current as any).states.userName).toBe(mockUser.username);
        expect((result.current as any).states.userId).toBe(mockUser.userId);
        expect((result.current as any).states.userEmail).toBe(mockUser.email);
    });

    it('should update loading state', () => {
        const { result } = testStoreFactory.renderHookWithStore(() => useUserState());

        act(() => {
            (result.current as any).setters.setIsLoading(false);
        });

        expect((result.current as any).states.isLoading).toBe(false);
    });

    it('should update auth user', () => {
        const { result } = testStoreFactory.renderHookWithStore(() => useUserState());
        const mockAuthUser = { username: 'testUser' } as AuthUser;

        act(() => {
            (result.current as any).setters.setAuthUser(mockAuthUser);
        });

        expect((result.current as any).states.authUser).toEqual(mockAuthUser);
    });

    it('should reset all states when resetUserState is called', () => {
        const { result } = testStoreFactory.renderHookWithStore(() => useUserState());

        // First set some values
        act(() => {
            (result.current as any).setters.setIsAuthenticated(true);
            (result.current as any).setters.setUserName('testUser');
            (result.current as any).setters.setUserId('user123');
            (result.current as any).setters.setUserEmail('test@example.com');
            (result.current as any).setters.setAuthUser({ username: 'testUser' } as AuthUser);
        });

        // Then reset
        act(() => {
            (result.current as any).resetUserState();
        });

        // Verify reset state
        expect((result.current as any).states).toEqual({
            isAuthenticated: false,
            isLoading: true,
            userName: null,
            userId: '',
            userEmail: null,
            authUser: null
        });
    });
});
