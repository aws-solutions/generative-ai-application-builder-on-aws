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

import createWrapper from '@cloudscape-design/components/test-utils/dom';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomeContext from '../../../../home/home.context';
import WizardView from '../../../wizard/WizardView';
import { API, Auth } from 'aws-amplify';

const mockAPI = {
    post: jest.fn()
};
jest.mock('@aws-amplify/api');
API.post = mockAPI.post;

describe('Wizard', () => {
    const contextValue = {
        dispatch: jest.fn(),
        state: {
            authorized: true,
            selectedDeployment: {},
            deploymentsData: [],
            deploymentAction: 'CREATE',
            runtimeConfig: {
                IsInternalUser: 'true',
                ModelProviders: {
                    HuggingFace: {
                        ModelProviderParams: {
                            RAGPromptTemplate: 'mock-hf-rag-prompt-template',
                            ChatPromptTemplate: 'mock-hf-prompt-template',
                            MaxTemperature: '100',
                            DefaultTemperature: '1',
                            MinTemperature: '0'
                        },
                        SupportedModels: [
                            'google/flan-t5-xxl',
                            'google/flan-t5-xl',
                            'google/flan-t5-large',
                            'google/flan-t5-base',
                            'google/flan-t5-small'
                        ],
                        AllowsStreaming: 'false'
                    },

                    Anthropic: {
                        ModelProviderParams: {
                            RAGPromptTemplate: 'mock-anthropic-rag-prompt-template',
                            ChatPromptTemplate: 'mock-anthropic-prompt-template',
                            MaxTemperature: '1',
                            DefaultTemperature: '1',
                            MinTemperature: '0'
                        },
                        SupportedModels: ['claude-instant-1', 'claude-1', 'claude-2'],
                        AllowsStreaming: 'true'
                    },
                    Bedrock: {
                        ModelFamilyParams: {
                            amazon: {
                                RAGPromptTemplate: 'mock-amazon-rag-prompt-template',
                                ChatPromptTemplate: 'mock-amazon-prompt-template',
                                MaxTemperature: '1',
                                DefaultTemperature: '1',
                                MinTemperature: '0'
                            },
                            anthropic: {
                                RAGPromptTemplate: 'mock-anthropic-rag-prompt-template',
                                ChatPromptTemplate: 'mock-anthropic-prompt-template',
                                MaxTemperature: '1',
                                DefaultTemperature: '1',
                                MinTemperature: '0'
                            },
                            'ai21': {
                                RAGPromptTemplate: 'mock-ai21-rag-prompt-template',
                                ChatPromptTemplate: 'mock-ai21-prompt-template',
                                MaxTemperature: '1',
                                DefaultTemperature: '1',
                                MinTemperature: '0'
                            }
                        },
                        SupportedModels: [
                            'ai21.j2-ultra',
                            'ai21.j2-mid',
                            'amazon.titan-text-express-v1',
                            'anthropic.claude-v1',
                            'anthropic.claude-v2',
                            'anthropic.claude-instant-v1',
                            'meta.llama2-13b-chat-v1',
                            'meta.llama2-70b-chat-v1',
                            'cohere.command-text-v14',
                            'cohere.command-light-text-v1'
                        ],
                        AllowsStreaming: 'false'
                    }
                }
            }
        }
    };

    beforeEach(() => {
        mockAPI.post.mockReset();
        Auth.currentAuthenticatedUser = jest.fn().mockImplementation(() => {
            return {
                getSignInUserSession: jest.fn().mockImplementation(() => {
                    return {
                        getAccessToken: jest.fn().mockImplementation(() => {
                            return {
                                getJwtToken: jest.fn().mockImplementation(() => {
                                    return 'fake-token';
                                })
                            };
                        })
                    };
                })
            };
        });


        jest.mock('../../../wizard/WizardView', () => ({
            ...jest.requireActual('../../../wizard/WizardView'), // Use the actual implementation for other exports
            useWizard: jest.fn(() => ({
                // Mock the functions and values returned by useWizard
                activeStepIndex: 0,
                stepsInfo: {},
                showErrorAlert: false,
                useCaseDeployStatus: '',
                setActiveStepIndexAndCloseTools: jest.fn(),
                onStepInfoChange: jest.fn(),
                onNavigate: jest.fn(),
                onSubmit: jest.fn()
            }))
        }));
    });

    test('The initial state is correct', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/wizardView']}>
                    <Routes>
                        <Route path="/wizardView" element={<WizardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        const element = screen.getByTestId('wizard-view');
        const wrapper = createWrapper(element);
        expect(wrapper.findBreadcrumbGroup()?.findBreadcrumbLinks()).toHaveLength(2);
    });

    it('should render without errors', () => {
        const { getByText } = render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/wizardView']}>
                    <Routes>
                        <Route path="/wizardView" element={<WizardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        // Your assertions here
    });
    it('should test some functionality using useWizard', () => {
        const { getByTestId } = render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/wizardView']}>
                    <Routes>
                        <Route path="/wizardView" element={<WizardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        // Your assertions here, interacting with the mocked useWizard functions
    });
});
