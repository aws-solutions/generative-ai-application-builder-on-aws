/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { Dispatch } from 'react';
import { Mock } from 'vitest';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomeContext from '../../home/home.context';
import { HomeInitialState } from '../../home/home.state';
import { ActionType } from '../../hooks/useCreateReducer';
import { Chat } from '../Chat';
import { API, Auth } from 'aws-amplify';
import { Server } from 'mock-socket';
import { mockedAuthenticator } from '../../utils/test-utils';
import { USE_CASE_TYPES, USE_CASE_TYPES_ROUTE } from '../../utils/constants';
import { act } from '@testing-library/react';

const createMockRefObject = (initialValue: boolean) => ({
    current: initialValue
});

vi.mock('react-markdown', () => {
    return {
        default: vi.fn().mockImplementation((props: any) => {
            return <>{props.children}</>;
        })
    };
});

vi.mock('remark-gfm', () => {
    return {
        default: vi.fn().mockImplementation((props: any) => {
            return <>{props.children}</>;
        })
    };
});

const mockAPI = {
    get: vi.fn()
};

vi.mock('@aws-amplify/api');
API.get = mockAPI.get;

vi.useFakeTimers();

describe('Chat UI Tests', () => {
    let confirmSpy: any;
    let mockServer: Server;
    let sentMessage: string | null;
    let responseMessage: string | null;
    const mockDefaultPrompt = '{history}\n\n{input}';
    const mockUserPrompt = '{history}\n\nHuman:{input}';
    const mockAuthToken = 'fake-token';
    const fakeSocketUrl = 'wss://fake-socketUrl';
    const mockMessage = 'Hello';
    const mockServerResponse = 'Mock response from the server';

    const contextValue = {
        dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: {
            loading: false,
            messageIsStreaming: false,
            selectedConversation: {
                id: '',
                name: 'New Conversation',
                messages: []
            },
            promptTemplate: undefined,
            defaultPromptTemplate: mockDefaultPrompt,
            useCaseConfig: {
                UseCaseType: USE_CASE_TYPES.TEXT,
                KnowledgeBaseParams: {
                    ReturnSourceDocs: false
                },
                LlmParams: {
                    PromptParams: {
                        UserPromptEditingEnabled: true
                    }
                }
            }
        },
        handleUpdateConversation: vi.fn()
    };

    const stopConversationRef = createMockRefObject(false);

    beforeEach(() => {
        confirmSpy = vi.spyOn(window, 'confirm');
        confirmSpy.mockImplementation(vi.fn(() => true));
        mockAPI.get.mockReset();
        window.alert = vi.fn() as Mock;
        window.scrollTo = vi.fn() as Mock;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
        mockServer = new Server(fakeSocketUrl);
        sentMessage = null;
        responseMessage = null;

        mockServer.on('error', (error) => {
            console.error('MockServer error:', error);
        });
    });

    afterEach(() => {
        cleanup();
        mockServer.close();
    });

    afterAll(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.resetAllMocks();
    });

    describe('Tests Sending Chat messages', () => {
        test('Sends a message for TEXT use case with default prompt', async () => {
            mockServer.on('connection', (socket) => {
                socket.on('message', (data) => {
                    sentMessage = data as string;
                });
                socket.send(mockServerResponse as string);
                responseMessage = mockServerResponse;
            });

            render(
                <HomeContext.Provider value={{ ...contextValue }}>
                    <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                </HomeContext.Provider>
            );

            await waitFor(() => {
                expect(mockServer.clients().length).toBe(1);
            });

            const input = screen.getByPlaceholderText('Type a message...');
            fireEvent.change(input, { target: { value: mockMessage } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

            await waitFor(
                () => {
                    expect(sentMessage).not.toBeNull();
                },
                { timeout: 5000 }
            );

            const parsedMessage = JSON.parse(sentMessage as string);
            expect(parsedMessage).toEqual({
                action: USE_CASE_TYPES_ROUTE.TEXT,
                question: mockMessage,
                conversationId: '',
                authToken: mockAuthToken
            });

            await waitFor(
                () => {
                    expect(sentMessage).not.toBeNull();
                },
                { timeout: 5000 }
            );

            await waitFor(() => {
                expect(responseMessage).toBe(mockServerResponse);
            });
        });

        test('Sends a message for TEXT use case with user provided prompt', async () => {
            const updatedContextValue = {
                dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
                state: {
                    loading: false,
                    messageIsStreaming: false,
                    selectedConversation: {
                        id: '',
                        name: 'New Conversation',
                        messages: []
                    },
                    promptTemplate: mockUserPrompt,
                    defaultPromptTemplate: mockDefaultPrompt,
                    useCaseConfig: {
                        UseCaseType: USE_CASE_TYPES.TEXT,
                        KnowledgeBaseParams: {
                            ReturnSourceDocs: false
                        },
                        LlmParams: {
                            PromptParams: {
                                UserPromptEditingEnabled: true
                            }
                        }
                    }
                },
                handleUpdateConversation: vi.fn()
            };

            mockServer.on('connection', (socket) => {
                socket.on('message', (data) => {
                    sentMessage = data as string;
                });
                socket.send(mockServerResponse as string);
                responseMessage = mockServerResponse;
            });

            render(
                <HomeContext.Provider value={{ ...updatedContextValue }}>
                    <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                </HomeContext.Provider>
            );

            await waitFor(() => {
                expect(mockServer.clients().length).toBe(1);
            });

            const input = screen.getByPlaceholderText('Type a message...');
            fireEvent.change(input, { target: { value: mockMessage } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

            await waitFor(
                () => {
                    expect(sentMessage).not.toBeNull();
                },
                { timeout: 5000 }
            );

            const parsedMessage = JSON.parse(sentMessage as string);
            expect(parsedMessage).toEqual({
                action: USE_CASE_TYPES_ROUTE.TEXT,
                question: mockMessage,
                conversationId: '',
                promptTemplate: mockUserPrompt,
                authToken: mockAuthToken
            });

            await waitFor(
                () => {
                    expect(sentMessage).not.toBeNull();
                },
                { timeout: 5000 }
            );

            await waitFor(() => {
                expect(responseMessage).toBe(mockServerResponse);
            });
        });

        test('Sends a message for AGENT use case', async () => {
            const agentContextValue = {
                dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
                state: {
                    loading: false,
                    messageIsStreaming: false,
                    selectedConversation: {
                        id: '',
                        name: 'New Conversation',
                        messages: []
                    },
                    promptTemplate: undefined,
                    defaultPromptTemplate: undefined,
                    useCaseConfig: {
                        UseCaseType: USE_CASE_TYPES.AGENT,
                        AgentParams: {
                            BedrockAgentParams: {
                                AgentAliasId: 'fake-alias-id',
                                AgentId: 'fake-agent-id',
                                EnableTrace: 'true'
                            }
                        }
                    }
                },
                handleUpdateConversation: vi.fn()
            };
            render(
                <HomeContext.Provider value={{ ...agentContextValue }}>
                    <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                </HomeContext.Provider>
            );

            mockServer.on('connection', (socket) => {
                socket.on('message', (data) => {
                    sentMessage = data as string;
                });
                socket.send(mockServerResponse as string);
                responseMessage = mockServerResponse;
            });

            await waitFor(() => {
                expect(mockServer.clients().length).toBe(1);
            });

            const input = screen.getByPlaceholderText('Type a message...');
            fireEvent.change(input, { target: { value: mockMessage } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

            await waitFor(
                () => {
                    expect(sentMessage).not.toBeNull();
                },
                { timeout: 5000 }
            );

            const parsedMessage = JSON.parse(sentMessage as string);
            expect(parsedMessage).toEqual({
                action: USE_CASE_TYPES_ROUTE.AGENT,
                inputText: 'Hello',
                conversationId: ''
            });

            await waitFor(
                () => {
                    expect(sentMessage).not.toBeNull();
                },
                { timeout: 5000 }
            );

            await waitFor(() => {
                expect(responseMessage).toBe(mockServerResponse);
            });
        });
    });

    describe('Test chat UI components and socket connections', () => {
        test('Socket test', async () => {
            mockServer.on('connection', (socket) => {
                socket.on('message', (data) => {
                    sentMessage = data as string;
                });
                socket.send(mockServerResponse as string);
                responseMessage = mockServerResponse;
            });

            await act(() => {
                render(
                    <HomeContext.Provider value={{ ...contextValue }}>
                        <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                    </HomeContext.Provider>
                );
            });

            const msgInputDiv = screen.getByTestId('chat-input-textarea-div');
            const msgInput = createWrapper(msgInputDiv).findTextarea();
            const sendButton = screen.getByTestId('send-button');

            await act(async () => {
                msgInput?.setTextareaValue(mockMessage as string);
                fireEvent.click(sendButton);
            });

            await waitFor(() => {
                expect(sentMessage).not.toBe(undefined);
                expect(responseMessage).not.toBe(undefined);
            });
        });

        test('Displays please enter a message alert if empty message is sent', async () => {
            const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
            render(
                <HomeContext.Provider value={{ ...contextValue }}>
                    <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                </HomeContext.Provider>
            );

            await act(async () => {
                const sendButton = screen.getByTestId('send-button');
                fireEvent.click(sendButton);
                expect(alertMock).toHaveBeenCalledTimes(1);
            });
        });

        test('Fires different buttons and clicks', async () => {
            render(
                <HomeContext.Provider value={{ ...contextValue }}>
                    <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                </HomeContext.Provider>
            );
            const clearButton = screen.getByTestId('clear-convo-button');
            const settingsButton = screen.getByTestId('settings-button');
            const sendButton = screen.getByTestId('send-button');
            const input = screen.getByPlaceholderText('Type a message...');

            await act(async () => {
                fireEvent.change(input, { target: { value: mockMessage } });
            });

            expect(input.textContent).toBe(mockMessage);
            await act(async () => {
                fireEvent.click(clearButton);
                fireEvent.click(settingsButton);
                fireEvent.click(sendButton);
            });
        });

        test('Handles incorrect socket URL', async () => {
            render(
                <HomeContext.Provider value={{ ...contextValue }}>
                    <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                </HomeContext.Provider>
            );
            const msgInputDiv = screen.getByTestId('chat-input-textarea-div');
            const msgInput = createWrapper(msgInputDiv).findTextarea();

            await act(async () => {
                msgInput?.setTextareaValue('fake message');
            });

            const sendButton = screen.getByTestId('send-button');

            await act(async () => {
                fireEvent.click(sendButton);
            });
        });

        test('The initial state is correct', async () => {
            await act(() => {
                render(
                    <HomeContext.Provider value={{ ...contextValue }}>
                        <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                    </HomeContext.Provider>
                );
            });
            const element = screen.getByTestId('chat-view');
            const wrapper = createWrapper(element);
            expect(wrapper.findButton()).toBeDefined();
        });

        test('Handles socket error event', async () => {
            await act(() => {
                render(
                    <HomeContext.Provider value={{ ...contextValue }}>
                        <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                    </HomeContext.Provider>
                );
            });

            expect(mockServer.clients().length).toBe(1);

            await act(async () => {
                mockServer.emit('error', new Error('Test error'));
            });

            const errorMessage = screen.getByText(
                'Connection failed. Please ensure you have proper access to the deployment and are logged in with the correct credentials.'
            );
            expect(errorMessage).toBeInTheDocument();
        });

        test('Handles socket close event', async () => {
            await act(() => {
                render(
                    <HomeContext.Provider value={{ ...contextValue }}>
                        <Chat stopConversationRef={stopConversationRef} socketUrl={fakeSocketUrl} />
                    </HomeContext.Provider>
                );
            });

            expect(mockServer.clients().length).toBe(1);

            await act(async () => {
                mockServer.close();
            });

            await waitFor(() => {
                const disconnectionMessage = screen.getByText(
                    'Disconnected. Please send a message to initiate reconnection.'
                );
                expect(disconnectionMessage).toBeInTheDocument();
            });
        });
    });
});
