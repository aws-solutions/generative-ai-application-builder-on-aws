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
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import HomeContext from '../../home/home.context';
import { HomeInitialState } from '../../home/home.state';
import { ActionType } from '../../hooks/useCreateReducer';
import { API } from 'aws-amplify';
import { PromptTemplate } from '../PromptTemplate';

const mockAPI = {
    get: jest.fn()
};
jest.mock('@aws-amplify/api');
API.get = mockAPI.get;

jest.useFakeTimers();

describe('Chat', () => {
    const contextValue = {
        dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: {
            RAGEnabled: false,
            selectedConversation: {
                id: '',
                name: 'New Conversation',
                messages: []
            },
            promptTemplate: 'fake prompt template',
            defaultPromptTemplate: '',
            userPromptEditingEnabled: true
        },
        handleUpdateConversation: jest.fn()
    };

    test('Prompt editing works when userPromptEditingEnabled is true', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <PromptTemplate onChangePrompt={jest.fn()} showPromptWindow={true} handleShowPromptWindow={jest.fn()} />
            </HomeContext.Provider>
        );
        const saveButton = screen.getByTestId('save-prompt-button');
        expect(saveButton).toBeInTheDocument();
        fireEvent.click(saveButton);
        const promptTemplate = screen.getByTestId('prompt-template');
        const promptTemplateTextArea = createWrapper(promptTemplate).findTextarea();
        promptTemplateTextArea?.setTextareaValue('fake prompt');
        fireEvent.click(saveButton);
        promptTemplateTextArea?.setTextareaValue('{input} {input}');
        fireEvent.click(saveButton);
        const resetPromptButton = screen.getByTestId('reset-to-default-prompt button');
        fireEvent.click(resetPromptButton);
        expect(screen.getByTestId('save-prompt-button')).toBeInTheDocument();
    });

    const contextValueEditingDisabled = {
        ...contextValue,
        state: {
            ...contextValue.state,
            userPromptEditingEnabled: false
        }
    };

    test('Prompt editing is disabled when userPromptEditingEnabled is false', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValueEditingDisabled }}>
                <PromptTemplate onChangePrompt={jest.fn()} showPromptWindow={true} handleShowPromptWindow={jest.fn()} />
            </HomeContext.Provider>
        );
        expect(screen.queryByTestId('prompt-template-textarea')).not.toBeInTheDocument();
        expect(screen.queryByTestId('save-prompt-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('reset-to-default-prompt button')).not.toBeInTheDocument();
    });
});
