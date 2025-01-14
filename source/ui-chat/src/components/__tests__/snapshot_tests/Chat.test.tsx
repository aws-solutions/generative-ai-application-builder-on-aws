// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Dispatch } from 'react';
import '@testing-library/jest-dom';
import renderer from 'react-test-renderer';
import HomeContext from '../../../home/home.context';
import { HomeInitialState } from '../../../home/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import { Chat } from '../../Chat';

jest.mock('@cloudscape-design/components', () => {
    const Components = jest.genMockFromModule('@cloudscape-design/components') as any;
    for (const componentName of Object.keys(Components)) {
        Components[componentName] = componentName;
    }
    return Components;
});

jest.mock('react-markdown', () => (props) => {
    return <>{props.children}</>;
});

jest.mock('remark-gfm', () => (props) => {
    return <>{props.children}</>;
});

const createMockRefObject = (initialValue: boolean) => ({
    current: initialValue
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
            defaultPromptTemplate: '',
            useCaseConfig: {
                KnowledgeBaseParams: {
                    ReturnSourceDocs: false
                }
            },
            userPromptEditingEnabled: true
        },
        handleUpdateConversation: jest.fn()
    };

    test('Snapshot test for Chat', async () => {
        const stopConersationRef = createMockRefObject(false);
        const tree = renderer
            .create(
                <>
                    <HomeContext.Provider
                        value={{
                            ...contextValue
                        }}
                    >
                        <Chat stopConversationRef={stopConersationRef} socketUrl={'fake-socketUrl'} />
                    </HomeContext.Provider>
                </>
            )
            .toJSON();
        expect(tree).toMatchSnapshot();
    });
});
