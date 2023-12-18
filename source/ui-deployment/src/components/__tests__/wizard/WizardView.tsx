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

import { Dispatch } from 'react';

import createWrapper from '@cloudscape-design/components/test-utils/dom';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomeContext from '../../../home/home.context';
import { HomeInitialState } from '../../../home/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import WizardView from '../../wizard/WizardView';
import { API_NAME, INTERNAL_USER_GENAI_POLICY_URL, LEGAL_DISCLAIMER } from '../../../utils/constants';
import { API, Auth } from 'aws-amplify';

const mockAPI = {
    post: jest.fn()
};
jest.mock('@aws-amplify/api');
API.post = mockAPI.post;
jest.setTimeout(20000);

describe('Wizard', () => {
    const contextValue = {
        dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
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

    test('Navigating through wizard steps and filling form.', async () => {
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
        const wizardWrapper = wrapper.findWizard();

        // step 1
        expect(wizardWrapper?.findMenuNavigationLink(1, 'active')).not.toBeNull();

        const useCaseTypeFieldElement = screen.getByTestId('use-case-type-field');
        const useCaseTypeSelect = createWrapper(useCaseTypeFieldElement).findSelect();
        useCaseTypeSelect?.openDropdown();
        useCaseTypeSelect?.selectOptionByValue('Chat');
        useCaseTypeSelect?.openDropdown();
        expect(useCaseTypeSelect?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain('Chat');

        const useCaseNameFieldElement = screen.getByTestId('use-case-name-field');
        const useCaseNameInput = createWrapper(useCaseNameFieldElement).findInput();
        useCaseNameInput?.setInputValue('');
        useCaseNameInput?.setInputValue('123');
        useCaseNameInput?.setInputValue('a--123');
        useCaseNameInput?.setInputValue('fake-use-case-name');

        const userEmailFieldElement = screen.getByTestId('user-email-field');
        const userEmailInput = createWrapper(userEmailFieldElement).findInput();
        userEmailInput?.setInputValue('incorrect-email');
        userEmailInput?.setInputValue('correct_email@example.com');

        const useCaseDescriptionFieldElement = screen.getByTestId('use-case-description-field');
        const useCaseDescriptionInput = createWrapper(useCaseDescriptionFieldElement).findTextarea();
        useCaseDescriptionInput?.setTextareaValue('1fake-use-case-description-name');
        useCaseDescriptionInput?.setTextareaValue('1fake-[use]-case-description-name');
        useCaseDescriptionInput?.setTextareaValue('fake-use-case-description-name');

        wizardWrapper?.findPrimaryButton().click();

        // step 2
        expect(wizardWrapper?.findMenuNavigationLink(2, 'active')).not.toBeNull();

        const modelProviderSelect = createWrapper(screen.getByTestId('model-provider-field')).findSelect();
        modelProviderSelect?.openDropdown();
        modelProviderSelect?.selectOptionByValue('Anthropic');
        modelProviderSelect?.openDropdown();
        expect(modelProviderSelect?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain(
            'Anthropic'
        );

        modelProviderSelect?.selectOptionByValue('Bedrock');
        modelProviderSelect?.openDropdown();
        expect(modelProviderSelect?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain(
            'Bedrock'
        );

        let modelNameDropdown = createWrapper(screen.getByTestId('model-name-dropdown')).findSelect();
        modelNameDropdown?.openDropdown();
        modelNameDropdown?.selectOptionByValue('amazon.titan-text-express-v1');
        modelNameDropdown?.openDropdown();
        expect(modelNameDropdown?.findDropdown().findSelectedOptions()[1].getElement().innerHTML).toContain(
            'amazon.titan-text-express-v1'
        );

        modelProviderSelect?.openDropdown();
        modelProviderSelect?.selectOptionByValue('HuggingFace');
        modelProviderSelect?.openDropdown();
        expect(modelProviderSelect?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain(
            'HuggingFace'
        );

        modelNameDropdown?.openDropdown();
        modelNameDropdown?.selectOptionByValue('google/flan-t5-xl');
        modelNameDropdown?.openDropdown();
        expect(modelNameDropdown?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain(
            'google/flan-t5-xl'
        );

        modelProviderSelect?.openDropdown();
        modelProviderSelect?.selectOptionByValue('HuggingFace-InferenceEndpoint');
        modelProviderSelect?.openDropdown();
        expect(modelProviderSelect?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain(
            'HuggingFace-InferenceEndpoint'
        );

        const hfInfModelNameDropdown = createWrapper(
            screen.getByTestId('hf-inf-endpoint-model-name-dropdown')
        ).findSelect();
        hfInfModelNameDropdown?.openDropdown();
        hfInfModelNameDropdown?.selectOptionByValue('google/flan-t5-xl');
        hfInfModelNameDropdown?.openDropdown();
        expect(hfInfModelNameDropdown?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain(
            'google/flan-t5-xl'
        );

        modelProviderSelect?.openDropdown();
        modelProviderSelect?.selectOptionByValue('Anthropic');
        modelProviderSelect?.openDropdown();
        expect(modelProviderSelect?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain(
            'Anthropic'
        );

        modelNameDropdown = createWrapper(screen.getByTestId('model-name-dropdown')).findSelect();
        modelNameDropdown?.openDropdown();
        expect(modelNameDropdown?.findDropdown()?.findSelectedOptions()[0]?.getElement()?.innerHTML).toContain(
            'claude-instant-1'
        );

        const modelApiKeyInput = createWrapper(screen.getByTestId('model-api-key-field')).findInput();
        modelApiKeyInput?.setInputValue('fake-api-key');

        const step2AdditionalSettingsExpandableElement = screen.getByTestId('step2-additional-settings-expandable');
        const step2AdditionalSettingsExpandable = createWrapper(step2AdditionalSettingsExpandableElement);
        step2AdditionalSettingsExpandable.click();

        const modelTemperatureInput = createWrapper(screen.getByTestId('model-temperature-field')).findInput();
        modelTemperatureInput?.setInputValue('0.25');

        createWrapper(screen.getByTestId('model-verbose-field')).findToggle()?.findNativeInput().click();
        // turn off streaming
        createWrapper(screen.getByTestId('model-streaming-field')).findToggle()?.findNativeInput().click();

        const modelParametersEditor = createWrapper(
            screen.getByTestId('advanced-settings-container')
        ).findAttributeEditor();
        modelParametersEditor?.findAddButton().click();
        const modelParamRow = modelParametersEditor?.findRow(1);
        modelParamRow?.findField(1)?.findControl()?.findInput()?.setInputValue('fake-key');
        modelParamRow?.findField(2)?.findControl()?.findInput()?.setInputValue('fake-value');
        const typeSelect = modelParamRow?.findField(3)?.findControl()?.findSelect();
        typeSelect?.openDropdown();
        typeSelect?.selectOption(2);
        typeSelect?.openDropdown();
        typeSelect?.selectOption(3);
        typeSelect?.openDropdown();
        typeSelect?.selectOption(4);
        typeSelect?.openDropdown();
        typeSelect?.selectOption(5);
        typeSelect?.openDropdown();
        typeSelect?.selectOption(6);
        typeSelect?.openDropdown();
        typeSelect?.selectOption(1);

        wizardWrapper?.findPrimaryButton().click();

        // step 3
        expect(wizardWrapper?.findMenuNavigationLink(3, 'active')).not.toBeNull();

        const ragRequiredFieldElement = screen.getByTestId('rag-required-dropdown');
        const ragRequiredSelect = createWrapper(ragRequiredFieldElement).findSelect();
        ragRequiredSelect?.openDropdown();
        ragRequiredSelect?.selectOption(2);
        ragRequiredSelect?.openDropdown();
        expect(ragRequiredSelect?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain('no');

        ragRequiredSelect?.selectOption(1);
        ragRequiredSelect?.openDropdown();
        expect(ragRequiredSelect?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain('yes');

        expect(screen.getByTestId('knowledge-base-options-container')).toBeDefined();
        const existingKendraIndexElement = screen.getByTestId('existing-kendra-index-radio-group');
        const exitingKendraIndexRadioGroup = createWrapper(existingKendraIndexElement).findRadioGroup();
        exitingKendraIndexRadioGroup?.findInputByValue('yes')?.click();

        expect(screen.getByTestId('input-kendra-index-id')).toBeDefined();
        const kendraIndexIdInput = createWrapper(screen.getByTestId('input-kendra-index-id')).findInput();
        kendraIndexIdInput?.setInputValue('fake-kendra-index-id');
        kendraIndexIdInput?.setInputValue('');
        kendraIndexIdInput?.setInputValue('fake-kendra-index-id');

        exitingKendraIndexRadioGroup?.findInputByValue('no')?.click();
        expect(screen.getByTestId('input-kendra-index-name')).toBeDefined();
        const kendraIndexNameInput = createWrapper(screen.getByTestId('input-kendra-index-name')).findInput();
        kendraIndexNameInput?.setInputValue('fake-kendra-index-name');
        kendraIndexNameInput?.setInputValue('');
        kendraIndexNameInput?.setInputValue('fake-kendra-index-name');

        const maxNumDocs = createWrapper(screen.getByTestId('input-max-num-docs')).findInput();
        expect(screen.getByTestId('input-max-num-docs')).toBeDefined();
        maxNumDocs?.setInputValue('3');
        expect(createWrapper(screen.getByTestId('input-max-num-docs'))?.findInput()?.getElement().innerHTML).toContain(
            '3'
        );

        const additionalKendraOptions = createWrapper(
            screen.getByTestId('additional-kendra-options')
        ).findExpandableSection();
        additionalKendraOptions?.click();

        const kendraAdditionalStorageCapacity = createWrapper(
            screen.getByTestId('kendra-add-storage-capacity')
        ).findInput();
        kendraAdditionalStorageCapacity?.setInputValue('1');
        const kendraAdditionalQueryCapacity = createWrapper(
            screen.getByTestId('kendra-add-query-capacity')
        ).findInput();
        kendraAdditionalQueryCapacity?.setInputValue('1');
        const kendraEdition = createWrapper(screen.getByTestId('kendra-edition')).findSelect();
        kendraEdition?.openDropdown();
        kendraEdition?.selectOption(2);

        // step 4
        wizardWrapper?.findPrimaryButton().click();
        expect(wizardWrapper?.findMenuNavigationLink(4, 'active')).not.toBeNull();

        const reviewElement = screen.getByTestId('review-deployment-component');
        expect(reviewElement).toBeDefined();

        const useCaseDetailsReviewComponent = screen.getByTestId('review-use-case-details');
        expect(useCaseDetailsReviewComponent).toBeDefined();
        const useCaseDetailsReviewComponentHtml = createWrapper(useCaseDetailsReviewComponent)?.getElement().innerHTML;
        expect(useCaseDetailsReviewComponentHtml).toContain('fake-use-case-name');
        expect(useCaseDetailsReviewComponentHtml).toContain('fake-use-case-description-name');
        expect(useCaseDetailsReviewComponentHtml).toContain('Text');

        const reviewModelDetailsReviewComponent = screen.getByTestId('review-system-prompt');
        expect(reviewModelDetailsReviewComponent).toBeDefined();
        expect(createWrapper(reviewModelDetailsReviewComponent)?.getElement().innerHTML).toContain(
            'mock-anthropic-rag-prompt-template'
        );

        const submitButton = await screen.findByRole('button', { name: 'Deploy use case' });
        expect(submitButton).toBeDefined();

        wizardWrapper?.findPrimaryButton().click();
        const deployComponentModal = screen.getByTestId('confirm-deployment-modal');
        expect(deployComponentModal).toBeDefined();

        expect(createWrapper(deployComponentModal).findButton('Cancel')).toBeDefined();
        expect(createWrapper(deployComponentModal).findButton('Deploy')).toBeDefined();

        expect(
            createWrapper(screen.getByTestId('internal-user-disclaimer-alert'))?.findBox()?.getElement().innerHTML
        ).toContain(
            `You must ensure you are complying with Amazon's <a id=\"link-self:r7b:\" data-testid=\"internal-policy-doc-link\" class=\"awsui_link_4c84z_15goh_93 awsui_variant-secondary_4c84z_15goh_140 awsui_font-size-body-m_4c84z_15goh_414\" aria-label=\"internal user policy document\" aria-labelledby=\"\" data-analytics-funnel-value=\"link:r7a:\" target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://policy.a2z.com/docs/568686/publication\">Third-Party Generative AI Use Policy</a>, including not sharing any confidential information without required approvals.`
        );

        expect(screen.getByRole('link', { name: 'internal user policy document' })).toHaveAttribute(
            'href',
            INTERNAL_USER_GENAI_POLICY_URL
        );

        expect(
            createWrapper(screen.getByTestId('legal-disclaimer-alert'))?.findBox()?.getElement().innerHTML
        ).toContain(LEGAL_DISCLAIMER);

        createWrapper(deployComponentModal).findButton('[data-testid="confirm-deployment-modal-submit-btn"]')?.click();
        await waitFor(async () => {
            expect(mockAPI.post).toHaveBeenCalledTimes(1);
        });
        expect(mockAPI.post).toHaveBeenCalledWith(API_NAME, '/deployments', {
            body: {
                ConsentToDataLeavingAWS: true,
                ConversationMemoryType: 'DynamoDB',
                DefaultUserEmail: 'correct_email@example.com',
                KnowledgeBaseParams: {
                    KendraIndexEdition: 'ENTERPRISE_EDITION',
                    KendraIndexName: 'fake-kendra-index-name',
                    NumberOfDocs: 3,
                    QueryCapacityUnits: 1,
                    ReturnSourceDocs: false,
                    StorageCapacityUnits: 1
                },
                KnowledgeBaseType: 'Kendra',
                LlmParams: {
                    ApiKey: 'fake-api-key',
                    ModelId: 'claude-instant-1',
                    ModelParams: {
                        'fake-key': {
                            'Type': 'string',
                            'Value': 'fake-value'
                        }
                    },
                    ModelProvider: 'Anthropic',
                    PromptTemplate: '',
                    RAGEnabled: true,
                    Streaming: false,
                    Temperature: 0.25,
                    Verbose: true
                },
                UseCaseDescription: 'fake-use-case-description-name',
                UseCaseName: 'fake-use-case-name'
            },
            headers: {
                Authorization: 'fake-token'
            }
        });
        const flashBarWrapper = createWrapper(reviewElement)?.findFlashbar();
        expect(flashBarWrapper).toBeDefined();
    });
});
