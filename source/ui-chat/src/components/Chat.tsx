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

import { Alert, Button, Container, StatusIndicatorProps } from '@cloudscape-design/components';
import { Auth } from 'aws-amplify';
import { MutableRefObject, memo, useCallback, useContext, useState, useRef, useEffect } from 'react';
import HomeContext from '../home/home.context';
import { Conversation, Message } from '../types/chat';
import { saveConversation } from '../utils/conversation';
import './Chat.css';
import { ChatInput } from './ChatInput';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { PromptTemplate } from './PromptTemplate';
import { END_CONVERSATION_TOKEN } from '../utils/constants';
interface Props {
    stopConversationRef: MutableRefObject<boolean>;
    socketUrl: string;
}

export async function generateToken() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const token = user.getSignInUserSession().getAccessToken().getJwtToken();
        return token;
    } catch (error) {
        console.error('error REST API:', error);
    }
}

// prettier-ignore
export const Chat = memo(({ stopConversationRef, socketUrl }: Props) => { // NOSONAR - This is a whole React component and should not be treated like other functions
    const {
        state: { selectedConversation, promptTemplate },
        dispatch: homeDispatch
    } = useContext(HomeContext);

    const [showSettings, setShowSettings] = useState<boolean>(true);
    const [socketState, setSocketState] = useState<number>(WebSocket.CLOSED);
    const [authorized, setAuthorized] = useState<boolean>(true)
    const updatedConversationRef = useRef(selectedConversation);

    let socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        updatedConversationRef.current = selectedConversation;
    }, [selectedConversation]);

    const scrollToBottom = () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
};

    const connectWebSocket = useCallback(async (firstConnection = false) => {
        try {
            const authToken = await generateToken();
            const newSocket = new WebSocket(socketUrl + '?Authorization=' + authToken);
            setSocketState(WebSocket.CONNECTING);
            socketRef.current = newSocket;
            newSocket.addEventListener('open', () => {
                setSocketState(WebSocket.OPEN);
            });

            newSocket.addEventListener('close', () => {
                setSocketState(WebSocket.CLOSED);
            });

            newSocket.addEventListener('error', (error) => {
                console.error('Socket error: ', error);
                setSocketState(4);
                if (firstConnection) {
                    setAuthorized(false)
                }
            });
        } catch (error) {
            console.error('Websocket connection error: ', error);
            // handle errors and reconnect after short delay
        }
    }, [socketUrl]);

    const getSocket = useCallback(async () => {
        let socket = socketRef.current;
        if (!socket || socket?.readyState !== WebSocket.OPEN) {
            setSocketState(WebSocket.CONNECTING);
            await connectWebSocket();
            socket = socketRef.current;
            const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
            let counter = 0;
            while (socket?.readyState === WebSocket.CONNECTING && counter < 15) {
                await delay(1000);
                counter += 1;
            }
            if (socket && socket?.readyState === WebSocket.OPEN) {
                setSocketState(WebSocket.OPEN);
            } else {
                setSocketState(4);
                console.error('Socket is still not connected. Cannot send message.');
            }
        }
        return socketRef.current;
    }, [connectWebSocket]);

    useEffect(() => {
        connectWebSocket(true);

        return () => {
            const socket = socketRef.current;
            if (socket) {
                socket.close();
                socketRef.current = null;
            }
        };
    }, [connectWebSocket]);

    const handleSend = useCallback(
        async (message: Message) => {
            setShowSettings(false);
            try {
                let socket = await getSocket();
                if (selectedConversation && socket && socket?.readyState === WebSocket.OPEN) {
                    let updatedConversation: Conversation;
                    updatedConversation = {
                        ...selectedConversation,
                        messages: [...selectedConversation.messages, message]
                    };
                    homeDispatch({
                        field: 'selectedConversation',
                        value: updatedConversation
                    });
                    updatedConversationRef.current = updatedConversation;
                    homeDispatch({ field: 'loading', value: true });
                    homeDispatch({ field: 'messageIsStreaming', value: true });
                    const response = new Response(JSON.stringify(''), {
                        status: 200,
                        statusText: 'ok'
                    });

                    let isFirst = true;

                    socket.onmessage = (event) => {
                        homeDispatch({ field: 'messageIsStreaming', value: true });
                        homeDispatch({ field: 'loading', value: true });
                        processResponse(event);
                        isFirst = false;
                    };

                    let payload = {
                        action: 'sendMessage',
                        question: message.content,
                        conversationId: selectedConversation.id,
                        promptTemplate: promptTemplate
                    };

                    socket.send(JSON.stringify(payload));

                    const data = response.body;
                    if (!data) {
                        homeDispatch({ field: 'loading', value: false });
                        homeDispatch({ field: 'messageIsStreaming', value: false });
                        return;
                    }
                    const reader = data.getReader();
                    let done = false;
                    let text = '';
                    while (!done) {
                        const { done: doneReading } = await reader.read();
                        done = doneReading;
                        const chunkValue = '';
                        text += chunkValue;
                        if (isFirst) {
                            isFirst = false;
                            const updatedMessages: Message[] = [
                                ...updatedConversation.messages,
                                { role: 'assistant', content: chunkValue }
                            ];
                            updatedConversation = {
                                ...updatedConversation,
                                messages: updatedMessages
                            };
                            homeDispatch({
                                field: 'selectedConversation',
                                value: updatedConversation
                            });
                            updatedConversationRef.current = updatedConversation;
                        } else {
                            const updatedMessages: Message[] = updatedConversation.messages.map(
                                (message: any, index: any) => {
                                    if (index === updatedConversation.messages.length - 1) {
                                        return {
                                            ...message,
                                            content: text
                                        };
                                    }
                                    return message;
                                }
                            );
                            updatedConversation = {
                                ...updatedConversation,
                                messages: updatedMessages
                            };
                            homeDispatch({
                                field: 'selectedConversation',
                                value: updatedConversation
                            });
                            updatedConversationRef.current = updatedConversation;
                        }
                    }
                    saveConversation(updatedConversation);
                    homeDispatch({ field: 'messageIsStreaming', value: false });
                    scrollToBottom()
                }
            } catch (error) {
                console.error('Error while sending message: ', error);
            }
        },
        [selectedConversation, stopConversationRef, getSocket, promptTemplate]
    );

    const processResponse = (event: any) => {
        let response = JSON.parse(event.data);
        if (!event.returnValue) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            return;
        }
        let text = '';
        
        if (response.errorMessage) {
            text += response.errorMessage;
            homeDispatch({ field: 'messageIsStreaming', value: false });
            homeDispatch({ field: 'loading', value: false });
        } else if (!response.data || response.data === END_CONVERSATION_TOKEN || response.errorMessage === END_CONVERSATION_TOKEN) {
            homeDispatch({ field: 'messageIsStreaming', value: false });
            homeDispatch({ field: 'loading', value: false });
            return;
        } else {
            text += response.data;
        }  

        const updatedMessages: Message[] = updatedConversationRef.current!.messages.map((message: any, index: any) => {
            if (index === updatedConversationRef.current!.messages.length - 1) {
                return {
                    ...message,
                    content: message.content + text
                };
            }
            return message;
        });

        const newUpdatedConversation = {
            ...updatedConversationRef.current!,
            messages: updatedMessages,
            id: response.conversationId
        };

        homeDispatch({
            field: 'selectedConversation',
            value: newUpdatedConversation
        });
        updatedConversationRef.current = newUpdatedConversation;
        saveConversation(newUpdatedConversation);
        scrollToBottom()
    };

    const handleSettings = (show = false) => {
        setShowSettings(show);
    };

    const onClearAll = () => {
        if (window.confirm('Are you sure you want to clear all messages?') && selectedConversation) {
            const updatedConversation = {
                ...selectedConversation,
                messages: [],
                id: ''
            };
            saveConversation(updatedConversation);
            homeDispatch({ field: 'selectedConversation', value: updatedConversation });
        }
    };

    let socketStatusType: StatusIndicatorProps.Type = 'loading';
    let socketStatusMessage = 'Connecting';
    switch (socketState) {
        case WebSocket.OPEN:
            socketStatusType = 'success';
            socketStatusMessage = 'Connected';
            break;
        case WebSocket.CLOSED:
            socketStatusType = 'stopped';
            socketStatusMessage = 'Disconnected. Please send a message to initiate reconnection.';
            break;
        case 4:
            socketStatusType = 'error';
            socketStatusMessage = 'Unable to connect. Please refresh page.';
    }

    if (authorized) {
        return (
            <div className="flex-1" data-testid="chat-view">
                {
                    <>
                        <div className="sticky top-0 z-10 flex justify-center bg-neutral-100 py-2">
                            <Button iconName="settings" variant="icon" onClick={() => handleSettings(!showSettings)} data-testid="settings-button"/>
                            <Button iconName="refresh" variant="icon" onClick={onClearAll} data-testid="clear-convo-button" />
                        </div>
                        {showSettings && (
                            <>
                                <div className="mx-auto sm:max-w-[600px] p-4">
                                    <PromptTemplate
                                        onChangePrompt={(prompt: any) =>
                                            homeDispatch({
                                                field: 'promptTemplate',
                                                value: prompt
                                            })
                                        }
                                        handleShowPromptWindow={handleSettings}
                                        showPromptWindow={showSettings}
                                    />
                                </div>
                            </>
                        )}
                        {!!selectedConversation?.messages.length && selectedConversation?.messages.length > 0 && (
                            <>
                                <div className="chatbox">
                                    <Container>
                                        {selectedConversation?.messages.map((message: any, index: any) => (
                                            <MemoizedChatMessage key={index} message={message} messageIndex={index} /> // NOSONAR - array index is a stable identifier
                                        ))}
                                    </Container>
                                </div>
                                <div className="h-[162px]" />
                            </>
                        )}
                        <div className="chat-input">
                            <ChatInput
                                stopConversationRef={stopConversationRef}
                                onSend={(message: any) => {
                                    handleSend(message);
                                }}
                                socketStatusType={socketStatusType}
                                socketStatusMessage={socketStatusMessage}
                            />
                        </div>
                    </>
                }
            </div>
        );
    }
    return (<div><Alert statusIconAriaLabel="Error"
    type="error"
    header="Connection failed. Please ensure you have proper access to the deployment and are logged in with the correct credentials."></Alert></div>)
    
});
Chat.displayName = 'Chat';
