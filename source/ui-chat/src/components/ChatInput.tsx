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

import { MutableRefObject, useContext, useState } from 'react';
import { Button, Container, StatusIndicator, StatusIndicatorProps, Textarea } from '@cloudscape-design/components';
import HomeContext from '../home/home.context';
import { Message } from '../types/chat';
import { MODEL_MAX_INPUT_LENGTH } from '../utils/constants';
import './ChatInput.css';

interface Props {
    onSend: (message: Message) => void;
    stopConversationRef: MutableRefObject<boolean>;
    socketStatusType: StatusIndicatorProps.Type;
    socketStatusMessage: string;
}

export const ChatInput = ({ onSend, stopConversationRef, socketStatusType, socketStatusMessage }: Props) => {
    const {
        state: { messageIsStreaming, loading }
    } = useContext(HomeContext);

    const [content, setContent] = useState<string>('');

    const handleChange = (value: string) => {
        if (value === '\n') {
            return;
        }
        setContent(value);
    };

    const verifyLength = () => {
        const maxLength = MODEL_MAX_INPUT_LENGTH;

        if (maxLength && content.length > maxLength) {
            alert(`Message limit is ${maxLength} characters. You have entered ${content.length} characters.`);
            return false;
        }

        return true;
    };

    const handleSend = () => {
        if (messageIsStreaming || loading || !verifyLength()) {
            return;
        }
        if (!content) {
            alert('Please enter a message');
            return;
        }
        onSend({ role: 'user', content });
        setContent('');
    };

    const handleKeyDown = (key: string, shiftKey: boolean) => {
        if (key === 'Enter' && !shiftKey) {
            handleSend();
        }
    };

    return (
        <Container>
            <StatusIndicator type={socketStatusType}> {socketStatusMessage} </StatusIndicator>{' '}
            <div className="chatinput-textarea">
                <div style={{ width: '92%', display: 'inline-block' }} data-testid="chat-input-textarea-div">
                    <Textarea
                        data-class-name="chat-input-textarea"
                        data-testid="chat-input-textarea"
                        data-columns="3"
                        placeholder={'Type a message...' || ''}
                        value={content}
                        rows={1}
                        onChange={({ detail }) => handleChange(detail.value)}
                        onKeyDown={({ detail }) => handleKeyDown(detail.key, detail.shiftKey)}
                        autoFocus
                    />
                </div>
                <div
                    style={{
                        float: 'right',
                        display: 'inline-block'
                    }}
                >
                    <Button
                        iconName={messageIsStreaming || loading ? 'status-in-progress' : 'check'}
                        loading={messageIsStreaming || loading}
                        variant="icon"
                        onClick={handleSend}
                        disabled={messageIsStreaming || loading}
                        data-testid={'send-button'}
                    />
                </div>
            </div>
        </Container>
    );
};
