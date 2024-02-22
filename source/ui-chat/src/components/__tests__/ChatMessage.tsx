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
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import HomeContext from '../../home/home.context';
import { HomeInitialState } from '../../home/home.state';
import { ActionType } from '../../hooks/useCreateReducer';
import { ChatMessage } from '../ChatMessage';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import userEvent from '@testing-library/user-event';

jest.mock('react-markdown', () => (props) => {
    return <>{props.children}</>;
});

jest.mock('remark-gfm', () => (props) => {
    return <>{props.children}</>;
});

describe('Chat', () => {
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
            defaultPromptTemplate: ''
        },
        handleUpdateConversation: jest.fn()
    };

    test('The initial state is correct', async () => {
        const user = userEvent.setup();
        render(
            <HomeContext.Provider
                value={{
                    ...contextValue
                }}
            >
                <ChatMessage
                    message={{ role: 'assistant', content: 'hello' }}
                    messageIndex={1}
                    displaySourceConfigFlag={false}
                />
            </HomeContext.Provider>
        );
        const copyMsgButton = screen.getByTestId('copy-msg-button');
        await user.click(copyMsgButton);
        const clipboardText = await navigator.clipboard.readText();
        expect(clipboardText).toBe('hello');
    });

    test('Model response with source documents modal should be created', async () => {
        const mockSourceDocuments = [
            {
                result_id: 'fake-result-id',
                document_id: 'fake-doc-id',
                title: 'fake-title',
                source: 'https://fake-url',
                excerpt: 'fake-excerpt'
            }
        ];
        render(
            <HomeContext.Provider
                value={{
                    ...contextValue
                }}
            >
                <ChatMessage
                    message={{ role: 'assistant', content: 'fake response', sourceDocuments: mockSourceDocuments }}
                    messageIndex={1}
                    displaySourceConfigFlag={true}
                />
            </HomeContext.Provider>
        );
        expect(screen.getByTestId('source-docs-button')).toBeDefined();
        const openSourceModalBtn = screen.getByTestId('source-docs-button');
        fireEvent.click(openSourceModalBtn);

        const sourceDocModalElement = screen.getByTestId('source-doc-modal');
        expect(sourceDocModalElement).toBeDefined();

        const expandableSection = screen.getByTestId('expandable-doc-source-section');
        expect(expandableSection).toBeDefined();

        createWrapper(expandableSection).findLink()?.click();
        const externalLinkModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkModal).toBeDefined();
        const openLinkButton = createWrapper(externalLinkModal).findButton(
            '[data-testid="external-link-warning-modal-open-button"]'
        );
        expect(openLinkButton).toBeDefined();
        expect(openLinkButton?.getElement().getAttribute('href')).toEqual(mockSourceDocuments[0]['source']);
    });

    test('Model response with source documents modal should be created', async () => {
        const mockSourceDocuments = [
            {
                result_id: 'fake-result-id',
                document_id: 'fake-doc-id',
                title: 'fake-title',
                source: 'https://fake-url',
                excerpt: 'fake-excerpt'
            }
        ];
        render(
            <HomeContext.Provider
                value={{
                    ...contextValue
                }}
            >
                <ChatMessage
                    message={{ role: 'assistant', content: 'fake response', sourceDocuments: mockSourceDocuments }}
                    messageIndex={1}
                    displaySourceConfigFlag={true}
                />
            </HomeContext.Provider>
        );
        expect(screen.getByTestId('source-docs-button')).toBeDefined();
        const openSourceModalBtn = screen.getByTestId('source-docs-button');
        fireEvent.click(openSourceModalBtn);

        const sourceDocModalElement = screen.getByTestId('source-doc-modal');
        expect(sourceDocModalElement).toBeDefined();

        const expandableSection = screen.getByTestId('expandable-doc-source-section');
        expect(expandableSection).toBeDefined();

        createWrapper(expandableSection).findLink()?.click();
        const externalLinkModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkModal).toBeDefined();
        const openLinkButton = createWrapper(externalLinkModal).findButton(
            '[data-testid="external-link-warning-modal-open-button"]'
        );
        expect(openLinkButton).toBeDefined();
        expect(openLinkButton?.getElement().getAttribute('href')).toEqual(mockSourceDocuments[0]['source']);
    });
});
