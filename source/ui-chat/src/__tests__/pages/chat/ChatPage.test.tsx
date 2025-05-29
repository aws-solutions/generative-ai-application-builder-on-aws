// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@cloudscape-design/chat-components/test-utils/dom';
import '@cloudscape-design/components/header';

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import ChatPage from '@pages/chat/ChatPage';
import { ReadyState } from 'react-use-websocket';
import { SplitPanelContext } from '@contexts/SplitPanelContext';
import { RootState } from '@store/store';
import { testStoreFactory } from '@/__tests__/utils/test-redux-store-factory';
import { UserContext } from '@/contexts/UserContext';
import { BASE_RUNTIME_CONFIG } from '@/__tests__/utils/test-configs';

// Mock the useWebSocket hook
vi.mock('react-use-websocket', () => {
    return {
        default: vi.fn(() => ({
            sendJsonMessage: vi.fn(),
            lastJsonMessage: null,
            readyState: ReadyState.OPEN
        })),
        ReadyState: {
            CONNECTING: 0,
            OPEN: 1,
            CLOSING: 2,
            CLOSED: 3,
            UNINSTANTIATED: 4
        }
    };
});

const mockUserContext: any = {
    isAuthenticated: true,
    isLoading: false,
    userName: 'testUser',
    userEmail: 'test@example.com',
    authUser: null,
    userId: 'test-user-id',
    detailsError: undefined,
    onSignIn: vi.fn(),
    onSignOut: vi.fn(),
    getAccessToken: vi.fn()
};

const mockRuntimeConfigNoUseCase: any = {
    'IsInternalUser': 'true',
    'ModelProviderName': 'Bedrock',
    'SocketURL': 'fake-socket-url',
    'CognitoRedirectUrl': 'http://localhost:5178',
    'UserPoolId': 'fake-user-pool',
    'ApiEndpoint': 'fake-api-endpoint',
    'SocketRoutes': ['sendMessage'],
    'UserPoolClientId': 'fake-client',
    'AwsRegion': 'us-east-1',
    'CognitoDomain': 'fake-domain',
    'RestApiEndpoint': 'fake-rest-endpoint',
    'UseCaseConfigKey': 'fake-id',
    'UseCaseConfig': undefined
};

const mockGetAccessToken = vi.fn().mockResolvedValue('mock-token');

// Create a separate mock for useChatMessages that we can customize per test
const addUserMessageMock = vi.fn();
const handleMessageMock = vi.fn();
const resetChatMock = vi.fn();

vi.mock('@hooks/use-chat-message', () => {
    return {
        useChatMessages: vi.fn()
    };
});

// Import the mocked modules so we can modify their behavior in tests
import useWebSocket from 'react-use-websocket';
import { useChatMessages } from '@hooks/use-chat-message';
import { createTestWrapper } from '@/__tests__/utils/test-utils';
import { RuntimeConfig } from '@/models';

// Helper function to render ChatPage with necessary providers
function renderChatPage(
    options: {
        preloadedState?: Partial<RootState>;
        splitPanelState?: { isOpen: boolean; setSplitPanelState: (state: any) => void };
        userContextValue?: typeof mockUserContext;
    } = {}
) {
    // Create a minimal default state for the split panel
    const defaultSplitPanelState = {
        header: 'Settings',
        content: null, // or some appropriate JSX element
        isOpen: false,
        onClose: () => {},
        isSettingsEnabled: true
    };

    // Create the context value with the correct structure
    const splitPanelContextValue = {
        splitPanelState: {
            ...defaultSplitPanelState,
            isOpen: options.splitPanelState?.isOpen ?? false
        },
        setSplitPanelState: options.splitPanelState?.setSplitPanelState || vi.fn()
    };

    const TextWrapper = createTestWrapper({ getAccessToken: mockGetAccessToken });

    return {
        ...testStoreFactory.renderWithStore(
            <TextWrapper>
                <UserContext.Provider value={options.userContextValue || mockUserContext}>
                    <SplitPanelContext.Provider value={splitPanelContextValue}>
                        <ChatPage />
                    </SplitPanelContext.Provider>
                </UserContext.Provider>
            </TextWrapper>,
            options.preloadedState || {}
        ),
        splitPanelState: options.splitPanelState
    };
}

describe('ChatPage', () => {
    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Set up default mock implementations
        (useWebSocket as any).mockReturnValue({
            sendJsonMessage: vi.fn(),
            lastJsonMessage: null,
            readyState: ReadyState.OPEN
        });

        (useChatMessages as any).mockReturnValue({
            messages: [],
            setMessages: vi.fn(),
            isGenAiResponseLoading: false,
            setIsGenAiResponseLoading: vi.fn(),
            handleMessage: handleMessageMock,
            conversationId: 'test-conversation-id',
            addUserMessage: addUserMessageMock,
            resetChat: resetChatMock
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    test('renders ChatPage with connection status', async () => {
        await act(async () => {
            renderChatPage();
        });

        expect(screen.getByTestId('chat-content-layout')).toBeInTheDocument();
    });

    test('sends a message when user submits input', async () => {
        const sendJsonMessageMock = vi.fn();

        // Override the mock implementation for this specific test
        (useWebSocket as any).mockReturnValue({
            sendJsonMessage: sendJsonMessageMock,
            lastJsonMessage: null,
            readyState: ReadyState.OPEN
        });

        await act(async () => {
            renderChatPage();
        });

        // Find the chat input and send button
        const container = screen.getByTestId('chat-content-layout');
        const wrapper = createWrapper(container).findContainer();
        const input = wrapper!.findFooter()!.findPromptInput();
        expect(input).toBeDefined();

        input!.setTextareaValue('Hello, this is a test message');
        input!.findActionButton()?.click();

        // Verify the message was sent
        await waitFor(() => {
            expect(addUserMessageMock).toHaveBeenCalledWith('Hello, this is a test message');
            expect(sendJsonMessageMock).toHaveBeenCalled();
        });
    });

    test('renders ChatPage with connection status', async () => {
        // Set WebSocket to CONNECTING state
        (useWebSocket as any).mockReturnValue({
            sendJsonMessage: vi.fn(),
            lastJsonMessage: null,
            readyState: ReadyState.CONNECTING
        });

        const { store } = renderChatPage();

        expect(store.getState().notifications.notifications).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    content: 'Connecting to chat service...'
                })
            ])
        );

        // Update to OPEN state and re-render
        (useWebSocket as any).mockReturnValue({
            sendJsonMessage: vi.fn(),
            lastJsonMessage: null,
            readyState: ReadyState.OPEN
        });

        const { store: storeRerender } = renderChatPage();

        // Check if the notifications array contains a notification with the updated content
        expect(storeRerender.getState().notifications.notifications).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    content: 'Connected to chat service'
                })
            ])
        );
    });

    test('handles incoming WebSocket messages', async () => {
        const mockResponse = { type: 'text', content: 'This is a response from the AI' };

        (useWebSocket as any).mockReturnValue({
            sendJsonMessage: vi.fn(),
            lastJsonMessage: mockResponse,
            readyState: ReadyState.OPEN
        });

        await act(async () => {
            renderChatPage();
        });

        // Verify the message was handled
        expect(handleMessageMock).toHaveBeenCalledWith(mockResponse);
    });

    test('opens settings panel when settings button is clicked', async () => {
        const setSplitPanelStateMock = vi.fn();

        await act(async () => {
            renderChatPage({
                splitPanelState: {
                    isOpen: false,
                    setSplitPanelState: setSplitPanelStateMock
                }
            });
        });

        // Find the chat container
        const container = screen.getByTestId('chat-content-layout');
        const wrapper = createWrapper(container).findContainer();

        // Find and click the settings button in the header
        const header = wrapper!.findHeader();
        const headerButtonGroup = header!.findButtonGroup();
        const settingsButton = headerButtonGroup!.findButtonById('settings');

        expect(settingsButton).toBeDefined();

        settingsButton!.click();

        // Verify the split panel state was updated
        expect(setSplitPanelStateMock).toHaveBeenCalled();
        expect(setSplitPanelStateMock.mock.calls[0][0]({ isOpen: false })).toEqual({ isOpen: true });
    });

    test('clears chat history when reset button is clicked', async () => {
        await act(async () => {
            renderChatPage({});
        });

        // Find the chat container
        const container = screen.getByTestId('chat-content-layout');
        const wrapper = createWrapper(container).findContainer();

        // Find and click the settings button in the header
        const header = wrapper!.findHeader();
        const headerButtonGroup = header!.findButtonGroup();
        const refreshButton = headerButtonGroup!.findButtonById('refresh');

        expect(refreshButton).toBeDefined();

        refreshButton!.click();

        // Verify the reset function was called
        expect(resetChatMock).toHaveBeenCalled();
    });

    test('shows loading state when user context is loading', async () => {
        const loadingUserContext = {
            ...mockUserContext,
            isLoading: true
        };

        // Force loading state by setting isLoading to true and using a minimal config without UseCaseConfig
        const { store } = renderChatPage({
            preloadedState: {
                config: {
                    runtimeConfig: {
                        ...BASE_RUNTIME_CONFIG,
                        UseCaseConfig: undefined
                    } as RuntimeConfig,
                    loading: true, // Set loading to true
                    error: null
                }
            },
            userContextValue: loadingUserContext
        });

        // Check for loading notification
        expect(store.getState().notifications.notifications).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    'content': 'Fetching configuration...',
                    'header': 'Loading',
                    'id': 'loading-status',
                    'type': 'info'
                })
            ])
        );

        // Verify chat content is not rendered
        expect(screen.queryByTestId('chat-content-layout')).not.toBeInTheDocument();
    });

    test('shows error state when deployment error exists', async () => {
        const errorUserContext = {
            ...mockUserContext,
            detailsError: {
                message: 'Failed to load deployment'
            }
        };

        const { store } = renderChatPage({
            preloadedState: {
                config: {
                    runtimeConfig: mockRuntimeConfigNoUseCase,
                    loading: false,
                    error: null
                }
            },
            userContextValue: errorUserContext
        });

        expect(store.getState().notifications.notifications).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    'content': 'Failed to fetch data. Please try again or contact a system administrator.',
                    'header': 'Error',
                    'id': 'data-fetch-error',
                    'type': 'error'
                })
            ])
        );

        expect(screen.queryByTestId('chat-content-layout')).not.toBeInTheDocument();
    });

    test('renders chat page when loading is complete and no errors', async () => {
        await act(async () => {
            renderChatPage({ userContextValue: mockUserContext });
        });

        expect(screen.queryByText('Fetching configuration...')).not.toBeInTheDocument();
        expect(screen.getByTestId('chat-content-layout')).toBeInTheDocument();
    });
});
