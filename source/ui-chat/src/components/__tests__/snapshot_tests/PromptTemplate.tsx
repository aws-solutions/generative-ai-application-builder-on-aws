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
