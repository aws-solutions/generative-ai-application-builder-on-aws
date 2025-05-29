// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ws } from 'msw';

interface ChatMessage {
    action: string;
    question?: string;
    conversationId?: string;
    promptTemplate?: string;
    authToken?: string;
}

export const createWebSocketHandlers = (wsUrl: string) => {
    const chat = ws.link(wsUrl);

    return [
        // Handle connection
        chat.addEventListener('connection', ({ client }) => {
            console.log('Mock WebSocket: New connection established');

            // Handle incoming messages
            client.addEventListener('message', (event) => {
                let messageData: string;

                // Handle different types of WebSocket data
                if (typeof event.data === 'string') {
                    messageData = event.data;
                } else if (event.data instanceof ArrayBuffer) {
                    messageData = new TextDecoder().decode(event.data);
                } else if (event.data instanceof Blob) {
                    console.warn('Blob data type not currently handled');
                    return;
                } else {
                    console.error('Unknown data type received');
                    return;
                }

                console.log('Mock WebSocket: Received message:', messageData);

                try {
                    const message: ChatMessage = JSON.parse(messageData);
                    console.log('Mock WebSocket: Parsed message:', message);

                    if (message.action === 'sendMessage') {
                        const conversationId = message.conversationId || 'new-conversation-id';

                        // Send first chunk
                        setTimeout(() => {
                            console.log('Mock WebSocket: Sending first chunk');
                            client.send(
                                JSON.stringify({
                                    data: 'First chunk of response...',
                                    conversationId,
                                    messageId: 'mock-message-id-123'
                                })
                            );
                        }, 100);

                        // Send second chunk
                        setTimeout(() => {
                            console.log('Mock WebSocket: Sending second chunk');
                            client.send(
                                JSON.stringify({
                                    data: 'Second chunk of response...',
                                    conversationId,
                                    messageId: 'mock-message-id-123'
                                })
                            );
                        }, 200);

                        // Send source document
                        setTimeout(() => {
                            console.log('Mock WebSocket: Sending source document');
                            client.send(
                                JSON.stringify({
                                    sourceDocument: {
                                        id: 'doc123',
                                        content: 'Example source document content',
                                        metadata: {
                                            title: 'Example Document',
                                            location: 's3://example-bucket/document.pdf'
                                        }
                                    },
                                    conversationId
                                })
                            );
                        }, 300);

                        // Send end marker
                        setTimeout(() => {
                            console.log('Mock WebSocket: Sending end marker');
                            client.send(
                                JSON.stringify({
                                    data: '##END_CONVERSATION##',
                                    conversationId,
                                    messageId: 'mock-message-id-123'
                                })
                            );
                        }, 400);
                    }
                } catch (error) {
                    console.error('Mock WebSocket: Error processing message:', error);
                }
            });

            // Handle connection close
            client.addEventListener('close', () => {
                console.log('Mock WebSocket: Connection closed');
            });
        })
    ];
};
