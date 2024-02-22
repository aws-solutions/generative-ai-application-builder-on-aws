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
 **********************************************************************************************************************/

import { Dispatch } from 'react';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomeContext from '../../home/home.context';
import { HomeInitialState } from '../../home/home.state';
import { ActionType } from '../../hooks/useCreateReducer';
import { Chat } from '../Chat';
import { API, Auth } from 'aws-amplify';
import { Server } from 'mock-socket';

const createMockRefObject = (initialValue: boolean) => ({
    current: initialValue
});

jest.mock('react-markdown', () => (props) => {
    return <>{props.children}</>;
});

jest.mock('remark-gfm', () => (props) => {
    return <>{props.children}</>;
});

const mockAPI = {
    get: jest.fn()
};
jest.mock('@aws-amplify/api');
API.get = mockAPI.get;

jest.useFakeTimers();

describe('Chat', () => {
    let confirmSpy;
    beforeEach(() => {
        confirmSpy = jest.spyOn(window, 'confirm');
        confirmSpy.mockImplementation(jest.fn(() => true));
    });
    beforeEach(() => {
        mockAPI.get.mockReset();

        Auth.currentAuthenticatedUser = jest.fn().mockImplementation(() => {
            return {
                getSignInUserSession: jest.fn().mockImplementation(() => {
                    return {
                        getAccessToken: jest.fn().mockImplementation(() => {
                            return {
                                getJwtToken: jest.fn().mockImplementation(() => {
                                    return 'fake-token';
                                })
                            };
                        })
                    };
                })
            };
        });
    });

    const contextValue = {
        dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: {
            loading: false,
            messageIsStreaming: false,
            selectedConversation: {
                id: '',
                name: 'New Conversation',
                messages: []
            },
            promptTemplate: '',
            defaultPromptTemplate: '',
            useCaseConfig: {
                KnowledgeBaseParams: {
                    ReturnSourceDocs: false
                }
            }
        },
        handleUpdateConversation: jest.fn()
    };

    const stopConersationRef = createMockRefObject(false);

    test('The initial state is correct', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <Chat stopConversationRef={stopConersationRef} socketUrl={'fake-socketUrl'} />
            </HomeContext.Provider>
        );
        const element = screen.getByTestId('chat-view');
        const wrapper = createWrapper(element);
        expect(wrapper.findButton()).toBeDefined();
    });

    test('Socket test', async () => {
        const mockServer = new Server('wss://fake-socketUrl');
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <Chat stopConversationRef={stopConersationRef} socketUrl={'wss://fake-socketUrl'} />
            </HomeContext.Provider>
        );
        let responseMessage;
        mockServer.on('connection', (socket) => {
            socket.onmessage = (message) => {
                responseMessage = message;
            };
            socket.send('Sending a message to the client');
        });
        const msgInputDiv = screen.getByTestId('chat-input-textarea-div');
        const msgInput = createWrapper(msgInputDiv).findTextarea();
        msgInput?.setTextareaValue('fake message');
        const sendButton = screen.getByTestId('send-button');
        await waitFor(async () => {
            expect(msgInput).toBeDefined();
        });
        fireEvent.click(sendButton);
        await waitFor(async () => {
            expect(sendButton).toBeDefined();
        });
        jest.advanceTimersByTime(1000);
        await waitFor(async () => {
            expect(sendButton).toBeDefined();
        });
        expect(responseMessage).not.toBe(undefined);
    });

    test('Displays please enter a message alert if empty message is sent', async () => {
        const alertMock = jest.spyOn(window, 'alert').mockImplementation();
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <Chat stopConversationRef={stopConersationRef} socketUrl={'fake-socketUrl'} />
            </HomeContext.Provider>
        );
        const sendButton = screen.getByTestId('send-button');
        fireEvent.click(sendButton);
        expect(alertMock).toHaveBeenCalledTimes(1);
    });

    test('Sends a message', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <Chat stopConversationRef={stopConersationRef} socketUrl={'ws://fake-socketUrl'} />
            </HomeContext.Provider>
        );
        const msgInputDiv = screen.getByTestId('chat-input-textarea-div');
        const msgInput = createWrapper(msgInputDiv).findTextarea();
        const clearButton = screen.getByTestId('clear-convo-button');
        fireEvent.click(clearButton);
        msgInput?.setTextareaValue('fake message');
        const settingsButton = screen.getByTestId('settings-button');
        fireEvent.click(settingsButton);
        const sendButton = screen.getByTestId('send-button');
        await waitFor(async () => {
            expect(msgInput).toBeDefined();
        });
        fireEvent.click(sendButton);
        await waitFor(async () => {
            expect(sendButton).toBeDefined();
        });
        jest.advanceTimersByTime(1000);
    });

    test('Handles incorrect socket URL', async () => {
        const mockServer = new Server('ws://incorrect-socketUrl');
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <Chat stopConversationRef={stopConersationRef} socketUrl={'fake-socketUrl'} />
            </HomeContext.Provider>
        );
        const msgInputDiv = screen.getByTestId('chat-input-textarea-div');
        const msgInput = createWrapper(msgInputDiv).findTextarea();
        msgInput?.setTextareaValue('fake message');
        const sendButton = screen.getByTestId('send-button');
        fireEvent.click(sendButton);
        mockServer.close();
    });
    afterAll(() => confirmSpy.mockRestore());
});
