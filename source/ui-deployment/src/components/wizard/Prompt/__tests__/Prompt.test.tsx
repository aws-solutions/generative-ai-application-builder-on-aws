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

import { mockFormComponentCallbacks, mockModelNamesQuery, renderWithProvider } from '@/utils';
import { cleanup, screen } from '@testing-library/react';
import Prompt from '../Prompt';
import { sampleDeployUseCaseFormData } from '@/components/__tests__/__mocks__/deployment-steps-form-data';
import * as QueryHooks from 'hooks/useQueries';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('Prompt', () => {
    const consoleMock = vi.spyOn(console, 'error').mockImplementation((error) => error);

    describe('test failure and loading states', () => {
        afterEach(() => {
            vi.clearAllMocks();
        });

        test('logs error to console if model-info api fails', async () => {
            vi.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
                isError: true,
                data: {}
            } as any);

            renderWithProvider(<Prompt info={sampleDeployUseCaseFormData} {...mockFormComponentCallbacks()} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            expect(consoleMock).toHaveBeenCalled();
        });

        test('display spinner if model-info api is not in a successful state yet and is still loading', async () => {
            vi.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
                isLoading: true,
                isSuccess: false,
                data: {}
            } as any);

            renderWithProvider(<Prompt info={sampleDeployUseCaseFormData} {...mockFormComponentCallbacks()} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            expect(screen.getByTestId('prompt-step-loading-spinner')).toBeDefined();
            expect(consoleMock).not.toHaveBeenCalled();
        });
    });

    describe('test that all components are rendered in a success state', () => {
        beforeEach(() => {
            const mockApiData = {
                'Prompt': 'mock-prompt',
                'MaxPromptSize': 10000,
                'MaxChatMessageSize': 10000,
                'DisambiguationPrompt': 'mock-disambiguation-prompt',
                'MemoryConfig': {
                    'history': 'chat_history',
                    'input': 'question',
                    'context': 'context',
                    'ai_prefix': 'AI',
                    'human_prefix': 'Human',
                    'output': 'answer'
                }
            };
            vi.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
                isLoading: false,
                isSuccess: true,
                data: mockApiData
            } as any);

            renderWithProvider(<Prompt info={sampleDeployUseCaseFormData} {...mockFormComponentCallbacks()} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });
        });

        afterEach(() => {
            vi.clearAllMocks();
        });

        test('render prompt experience', async () => {
            expect(screen.getByTestId('prompt-step-prompt-experience-component')).toBeDefined();
        });

        test('render prompt template', async () => {
            expect(screen.getByTestId('prompt-step-prompt-template-component')).toBeDefined();
            expect(
                screen.getByTestId('prompt-step-prompt-template-component-rephrase-question-formfield')
            ).toBeDefined();
        });

        test('render history configuration', async () => {
            expect(screen.getByTestId('prompt-step-history-configuration-component')).toBeDefined();
        });

        test('render disambiguation prompt', async () => {
            expect(screen.getByTestId('prompt-step-disambiguation-prompt-configuration-component')).toBeDefined();
        });

        test('dont render disambiguation prompt or rephrase question when RAG is not enabled', async () => {
            const ragDisabledFormData = {
                ...sampleDeployUseCaseFormData,
                knowledgeBase: { ...sampleDeployUseCaseFormData.knowledgeBase, isRagRequired: false }
            };

            //before re-rendering, first clear the screen to prevent clashing with previous render
            cleanup();
            renderWithProvider(<Prompt info={ragDisabledFormData} {...mockFormComponentCallbacks()} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });
            expect(screen.queryByTestId('prompt-step-disambiguation-prompt-configuration-component')).toBeNull();
            expect(
                screen.queryByTestId('prompt-step-prompt-template-component-rephrase-question-formfield')
            ).toBeNull();
        });

        test('dont render spinner or log error', async () => {
            expect(screen.queryByTestId('prompt-step-loading-spinner')).toBeNull();
            expect(consoleMock).not.toHaveBeenCalled();
        });
    });
});
