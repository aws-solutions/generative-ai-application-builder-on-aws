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

import { FC, memo, useContext, useState } from 'react';
import { Button, Icon } from '@cloudscape-design/components';
import HomeContext from '../home/home.context';
import { Message } from '../types/chat';

export interface Props {
    message: Message;
    messageIndex: number;
}

export const ChatMessage: FC<Props> = memo(({ message, messageIndex }) => {
    const {
        state: { selectedConversation, messageIsStreaming, loading }
    } = useContext(HomeContext);

    const [messagedCopied, setMessageCopied] = useState(false);

    const copyOnClick = () => {
        if (!navigator.clipboard) return;

        navigator.clipboard.writeText(message.content).then(() => {
            setMessageCopied(true);
            setTimeout(() => {
                setMessageCopied(false);
            }, 2000);
        });
    };

    return (
        <div className={`${message.role === 'assistant' ? 'bg-gray-100' : ''}`} style={{ overflowWrap: 'anywhere' }}>
            <div className=" m-auto flex md:gap-6 md:py-6 xl:max-w-2xl">
                {message.role === 'assistant' && (
                    <div className="text-right font-bold ">
                        <Icon name={'contact'} />
                    </div>
                )}

                <div className="prose mt-[-2px] w-full">
                    {message.role === 'user' ? (
                        <div className="w-full">
                            <div className="user-message">{message.content}</div>
                        </div>
                    ) : (
                        <div className="flex ">
                            <div className="flex-1">
                                {message.content}
                                <span className="animate-pulse">
                                    {(messageIsStreaming || loading) &&
                                    messageIndex === (selectedConversation?.messages.length ?? 0) - 1
                                        ? '▍'
                                        : ''}
                                </span>
                            </div>
                            <div className="copy-button-div md:-mr-8">
                                {messagedCopied ? (
                                    <Icon name="status-positive" />
                                ) : (
                                    <div className="copy-button-div-nested">
                                        <Button
                                            data-testid="copy-msg-button"
                                            iconName="copy"
                                            variant="icon"
                                            onClick={copyOnClick}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {message.role === 'user' && (
                    <div className="min-w-[40px] text-right">
                        <Icon name={'user-profile'} />
                    </div>
                )}
            </div>
        </div>
    );
});
ChatMessage.displayName = 'ChatMessage';
