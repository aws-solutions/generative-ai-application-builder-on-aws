// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, waitFor } from '@testing-library/react';
import { UserContext, UserContextProvider } from './UserContext';
import { Auth } from '@aws-amplify/auth';
import { useContext } from 'react';

vi.mock('@aws-amplify/auth');
vi.mock('@aws-amplify/core', () => ({
  Hub: {
    listen: vi.fn(),
  }
}));

describe('UserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should set isAdmin to true when user belongs to admin group', async () => {
    (Auth.currentAuthenticatedUser as jest.Mock).mockResolvedValue({
      signInUserSession: {
        accessToken: {
          payload: {
            'cognito:groups': ['deployment-dashboard-admins']
          }
        }
      }
    });

    const TestComponent = () => {
      const { user, isAdmin } = useContext(UserContext);
      return (
        <div>
          <div data-testid="is-admin">{isAdmin ? 'true' : 'false'}</div>
          <div data-testid="has-user">{user ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <UserContextProvider>
        <TestComponent />
      </UserContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-admin').textContent).toBe('true');
      expect(screen.getByTestId('has-user').textContent).toBe('true');
    });

    expect(Auth.currentAuthenticatedUser).toHaveBeenCalled();
  });

  test('should set isAdmin to true when user belongs to a group with admin in the name', async () => {
    (Auth.currentAuthenticatedUser as jest.Mock).mockResolvedValue({
      signInUserSession: {
        accessToken: {
          payload: {
            'cognito:groups': ['some-admin-group']
          }
        }
      }
    });

    const TestComponent = () => {
      const { user, isAdmin } = useContext(UserContext);
      return (
        <div>
          <div data-testid="is-admin">{isAdmin ? 'true' : 'false'}</div>
          <div data-testid="has-user">{user ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <UserContextProvider>
        <TestComponent />
      </UserContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-admin').textContent).toBe('true');
      expect(screen.getByTestId('has-user').textContent).toBe('true');
    });

    expect(Auth.currentAuthenticatedUser).toHaveBeenCalled();
  });

  test('should set isAdmin to false when user does not belong to admin group', async () => {
    (Auth.currentAuthenticatedUser as jest.Mock).mockResolvedValue({
      signInUserSession: {
        accessToken: {
          payload: {
            'cognito:groups': ['business-users']
          }
        }
      }
    });

    const TestComponent = () => {
      const { user, isAdmin } = useContext(UserContext);
      return (
        <div>
          <div data-testid="is-admin">{isAdmin ? 'true' : 'false'}</div>
          <div data-testid="has-user">{user ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <UserContextProvider>
        <TestComponent />
      </UserContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-admin').textContent).toBe('false');
      expect(screen.getByTestId('has-user').textContent).toBe('true');
    });

    expect(Auth.currentAuthenticatedUser).toHaveBeenCalled();
  });

  test('should set isAdmin to false when user has no groups', async () => {
    (Auth.currentAuthenticatedUser as jest.Mock).mockResolvedValue({
      signInUserSession: {
        accessToken: {
          payload: {}
        }
      }
    });

    const TestComponent = () => {
      const { user, isAdmin } = useContext(UserContext);
      return (
        <div>
          <div data-testid="is-admin">{isAdmin ? 'true' : 'false'}</div>
          <div data-testid="has-user">{user ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <UserContextProvider>
        <TestComponent />
      </UserContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-admin').textContent).toBe('false');
      expect(screen.getByTestId('has-user').textContent).toBe('true');
    });

    expect(Auth.currentAuthenticatedUser).toHaveBeenCalled();
  });

  test('should set isAdmin to false when authentication fails', async () => {
    (Auth.currentAuthenticatedUser as jest.Mock).mockRejectedValue(new Error('Not authenticated'));

    const TestComponent = () => {
      const { user, isAdmin } = useContext(UserContext);
      return (
        <div>
          <div data-testid="is-admin">{isAdmin ? 'true' : 'false'}</div>
          <div data-testid="has-user">{user ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <UserContextProvider>
        <TestComponent />
      </UserContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-admin').textContent).toBe('false');
      expect(screen.getByTestId('has-user').textContent).toBe('false');
    });

    expect(Auth.currentAuthenticatedUser).toHaveBeenCalled();
  });
});
