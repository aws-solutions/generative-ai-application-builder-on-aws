// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Dispatch } from 'react';
import '@testing-library/jest-dom';
import renderer from 'react-test-renderer';
import HomeContext from '../../../home/home.context';
import { HomeInitialState } from '../../../home/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import { PromptTemplate } from '../../PromptTemplate';

jest.mock('@cloudscape-design/components', () => {
    const Components = jest.genMockFromModule('@cloudscape-design/components') as any;
    for (const componentName of Object.keys(Components)) {
        Components[componentName] = componentName;
    }
    return Components;
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

    test('Snapshot test for prompt template', async () => {
        const tree = renderer
            .create(
                <>
                    <HomeContext.Provider
                        value={{
                            ...contextValue
                        }}
                    >
                        <PromptTemplate
                            onChangePrompt={jest.fn()}
                            showPromptWindow={true}
                            handleShowPromptWindow={jest.fn()}
                        />
                    </HomeContext.Provider>
                </>
            )
            .toJSON();
        expect(tree).toMatchSnapshot();
    });

    test('Does not show prompt window if showPromptWindow is false', async () => {
        const tree = renderer
            .create(
                <>
                    <HomeContext.Provider
                        value={{
                            ...contextValue
                        }}
                    >
                        <PromptTemplate
                            onChangePrompt={jest.fn()}
                            showPromptWindow={false}
                            handleShowPromptWindow={jest.fn()}
                        />
                    </HomeContext.Provider>
                </>
            )
            .toJSON();
        expect(tree).toMatchSnapshot();
    });
});
