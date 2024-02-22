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
import { MessageWithSource } from '../types/chat';
import { MemoizedReactMarkdown } from './MemoizedReactMarkdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { CodeBlock } from './CodeBlock';
import { Components } from 'react-markdown';

import { SourceDocumentsModal } from './SourceDocumentsModal';

export interface Props {
    message: MessageWithSource;
    messageIndex: number;
    displaySourceConfigFlag: boolean;
}

const MARKDOWN_COMPONENTS: Components = {
    code: ({ node, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '');

        return match ? (
            <CodeBlock language={(match && match[1]) || ''} value={String(children).replace(/\n$/, '')} {...props} />
        ) : (
            <code className={className} {...props}>
                {children}
            </code>
        );
    },
    table: ({ children }) => {
        return <table>{children}</table>;
    },
    th: ({ children }) => {
        return <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white">{children}</th>;
    },
    td: ({ children }) => {
        return <td className="break-words border border-black px-3 py-1">{children}</td>;
    }
};

export const ChatMessage: FC<Props> = memo(({ message, messageIndex, displaySourceConfigFlag }) => {
    const {
        state: { selectedConversation, messageIsStreaming }
    } = useContext(HomeContext);

    const [messagedCopied, setMessageCopied] = useState(false);
    const [docSourceModalVisible, setDocSourceModalVisible] = useState(false);
    const onModalDismiss = () => setDocSourceModalVisible(false);

    const copyOnClick = () => {
        if (!navigator.clipboard) return;

        navigator.clipboard.writeText(message.content).then(() => {
            setMessageCopied(true);
            setTimeout(() => {
                setMessageCopied(false);
            }, 2000);
        });
    };

    const displaySourceInResponse =
        displaySourceConfigFlag && message.sourceDocuments && message.sourceDocuments.length > 0;


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
                            <div>{message.content}</div>
                        </div>
                    ) : (
                        <div className="flex ">
                            <div className="flex-1">
                                <MemoizedReactMarkdown
                                    className="prose dark:prose-invert flex-1"
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    disallowedElements={['a']}
                                    unwrapDisallowed
                                    components={MARKDOWN_COMPONENTS}
                                >
                                    {`${message.content}${
                                        messageIsStreaming &&
                                        messageIndex === (selectedConversation?.messages.length ?? 0) - 1
                                            ? '▍'
                                            : ''
                                    }`}
                                </MemoizedReactMarkdown>
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
                                {displaySourceInResponse && (
                                    <div>
                                        <Button
                                            data-testid="source-docs-button"
                                            iconName="status-info"
                                            variant="icon"
                                            onClick={() => setDocSourceModalVisible(true)}
                                        />

                                        <SourceDocumentsModal
                                            visible={docSourceModalVisible}
                                            onDismiss={onModalDismiss}
                                            sourceDocumentsData={message.sourceDocuments}
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
