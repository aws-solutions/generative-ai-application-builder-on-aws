// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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

    test('Model response with kendra source documents modal should be created', async () => {
        const mockSourceDocuments = [
            {
                document_id: 'fake-doc-id',
                document_title: 'fake-title',
                excerpt: 'fake-excerpt',
                location: 'https://fake-url',
                score: 'HIGH',
                additional_attributes: {}
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

        // normal link, from kendra
        const expandableSection = screen.getByTestId('expandable-doc-source-section-0');
        expect(expandableSection).toBeDefined();

        createWrapper(expandableSection).findLink()?.click();
        const externalLinkModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkModal).toBeDefined();
        const openLinkButton = createWrapper(externalLinkModal).findButton(
            '[data-testid="external-link-warning-modal-open-button"]'
        );
        expect(openLinkButton).toBeDefined();
        expect(openLinkButton?.getElement().getAttribute('href')).toEqual(mockSourceDocuments[0]['location']);
    });

    test('Model response with bedrock source documents modal should be created', async () => {
        const mockSourceDocuments = [
            {
                document_id: null,
                document_title: null,
                excerpt: 'fake-excerpt',
                location: 's3://fake-bucket/fakeobject',
                score: 0.9,
                additional_attributes: {}
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

        // s3 link, from bedrock kb
        const expandableSection = screen.getByTestId('expandable-doc-source-section-0');
        expect(expandableSection).toBeDefined();

        createWrapper(expandableSection).findLink()?.click();
        const externalLinkModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkModal).toBeDefined();
        const openLinkButton = createWrapper(externalLinkModal).findButton(
            '[data-testid="external-link-warning-modal-open-button"]'
        );
        expect(openLinkButton).toBeDefined();
        expect(openLinkButton?.getElement().getAttribute('href')).toContain(
            mockSourceDocuments[0]['location'].substring(5)
        );
    });
});
