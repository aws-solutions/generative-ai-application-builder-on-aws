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

import React, { Dispatch } from 'react';

import createWrapper from '@cloudscape-design/components/test-utils/dom';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomeContext from '../../../contexts/home.context';
import { HomeInitialState } from '../../../contexts/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import { API, Auth } from 'aws-amplify';
import { mockReactMarkdown, mockedAuthenticator, renderWithProvider } from '@/utils';
import WizardView from '../../wizard/WizardView';
import * as QueryHooks from 'hooks/useQueries';
import {
    API_NAME,
    DELAY_AFTER_SUCCESS_DEPLOYMENT,
    INTERNAL_USER_GENAI_POLICY_URL,
    USECASE_TYPE_ROUTE
} from '@/utils/constants';
import mockContext from '../__mocks__/mock-context.json';
import { TextUseCaseType } from '@/components/wizard/interfaces/UseCaseTypes/Text';

const mockAPI = {
    post: jest.fn(),
    get: jest.fn()
};
jest.mock('@aws-amplify/api');
API.post = mockAPI.post;

window.scrollTo = jest.fn();

describe('Wizard', () => {
    const contextValue = {
        dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: {
            authorized: true,
            selectedDeployment: {},
            deploymentsData: [],
            deploymentAction: 'CREATE',
            usecaseType: '',
            runtimeConfig: {
                IsInternalUser: 'true'
            },
            reloadData: true,
            searchFilter: '',
            submittedSearchFilter: '',
            numUseCases: 1,
            currentPageIndex: 1
        }
    };

    beforeEach(() => {
        mockAPI.post.mockReset();
        Auth.currentAuthenticatedUser = mockedAuthenticator();
        mockReactMarkdown();

        jest.spyOn(QueryHooks, 'useModelProvidersQuery').mockReturnValue({
            isLoading: false,
            isError: false,
            data: ['Bedrock', 'SageMaker'],
            placeholderData: ['Bedrock', 'SageMaker']
        } as any);

        jest.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
            isSuccess: true,
            isError: false,
            data: { Prompt: '{context}\n\n{history}\n\n{input}' }
        } as any);

        jest.spyOn(QueryHooks, 'useModelNameQuery').mockImplementation((providerName: string) => {
            switch (providerName) {
                case 'Bedrock':
                    return {
                        isLoading: false,
                        isError: false,
                        data: [
                            'ai21.j2-ultra',
                            'ai21.j2-mid',
                            'amazon.titan-text-express-v1',
                            'anthropic.claude-v1',
                            'anthropic.claude-v2',
                            'anthropic.claude-instant-v1'
                        ]
                    } as any;

                default:
                    break;
            }
        });
    });

    test('The initial state is correct', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={[USECASE_TYPE_ROUTE.TEXT]}>
                    <Routes>
                        <Route
                            path={USECASE_TYPE_ROUTE.TEXT}
                            element={<WizardView useCase={new TextUseCaseType()} />}
                        />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        const element = screen.getByTestId('wizard-view');
        const wrapper = createWrapper(element);
        expect(wrapper.findBreadcrumbGroup()?.findBreadcrumbLinks()).toHaveLength(3);
    });

    test('Navigating through wizard steps and filling form.', async () => {
        // prevent infinite loop in jest execution
        const mockUseEffect = jest.fn();
        jest.spyOn(React, 'useEffect').mockImplementation(mockUseEffect);

        renderWithProvider(<WizardView useCase={new TextUseCaseType()} />, { route: USECASE_TYPE_ROUTE.TEXT });
        const element = screen.getByTestId('wizard-view');
        const wrapper = createWrapper(element);
        const wizardWrapper = wrapper.findWizard();

        // step 1
        expect(wizardWrapper?.findMenuNavigationLink(1, 'active')).not.toBeNull();

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

        // step 2 - vpc
        expect(wizardWrapper?.findMenuNavigationLink(2, 'active')).not.toBeNull();
        const selectVpcRadioGroup = createWrapper(screen.getByTestId('deploy-in-vpc-field')).findRadioGroup();
        expect(selectVpcRadioGroup).toBeDefined();
        expect(selectVpcRadioGroup?.findInputByValue('Yes')).toBeTruthy();
        expect(selectVpcRadioGroup?.findInputByValue('No')).toBeTruthy();

        wizardWrapper?.findPrimaryButton().click();

        // step 3 - model
        expect(wizardWrapper?.findMenuNavigationLink(3, 'active')).not.toBeNull();

        const modelProviderSelect = createWrapper(screen.getByTestId('model-provider-field')).findSelect();
        expect(modelProviderSelect).toBeDefined();
        modelProviderSelect?.openDropdown();

        expect(modelProviderSelect?.findDropdown().findOptions().length).toBe(2);
        modelProviderSelect?.selectOptionByValue('SageMaker');
        modelProviderSelect?.openDropdown();
        expect(modelProviderSelect?.findDropdown().findSelectedOptions()[0].getElement().innerHTML).toContain(
            'SageMaker'
        );

        modelProviderSelect?.selectOptionByValue('Bedrock');
        modelProviderSelect?.openDropdown();
        expect(modelProviderSelect?.findDropdown().findOptionByValue('Bedrock')).toBeTruthy();

        let modelNameDropdown = createWrapper(screen.getByTestId('model-name-dropdown')).findSelect(
            '[data-testid="model-name-dropdown-select"]'
        );
        modelNameDropdown?.openDropdown();
        modelNameDropdown?.selectOptionByValue('amazon.titan-text-express-v1');
        modelNameDropdown?.openDropdown();
        expect(modelNameDropdown?.findDropdown().findSelectedOptions()[1].getElement().innerHTML).toContain(
            'amazon.titan-text-express-v1'
        );

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

        expect(modelParametersEditor).toBeDefined();

        modelParametersEditor?.findAddButton().click();
        const modelParamRow = modelParametersEditor?.findRow(1);
        modelParamRow?.findField(1)?.findControl()?.findInput()?.setInputValue('fake-key');
        modelParamRow?.findField(2)?.findControl()?.findInput()?.setInputValue('fake-value');

        const typeSelect = modelParamRow?.findField(3)?.findControl()?.findSelect();
        typeSelect?.openDropdown();
        expect(typeSelect?.findDropdown().findOptions().length).toBe(6);
        typeSelect?.selectOptionByValue('string');

        wizardWrapper?.findPrimaryButton().click();

        // step 4
        expect(wizardWrapper?.findMenuNavigationLink(4, 'active')).not.toBeNull();

        const ragRequiredFieldElement = screen.getByTestId('rag-required-container');
        const ragRequiredRadioGroup = createWrapper(ragRequiredFieldElement).findRadioGroup();
        expect(ragRequiredRadioGroup).toBeDefined();
        expect(ragRequiredRadioGroup?.findInputByValue('true')).toBeDefined();
        expect(ragRequiredRadioGroup?.findInputByValue('false')).toBeDefined();
        ragRequiredRadioGroup?.findInputByValue('true')?.click();

        expect(screen.getByTestId('kendra-container')).toBeDefined();
        const existingKendraIndexElement = screen.getByTestId('existing-kendra-index-select');
        const exitingKendraIndexRadioGroup = createWrapper(existingKendraIndexElement).findRadioGroup();
        exitingKendraIndexRadioGroup?.findInputByValue('Yes')?.click();

        expect(screen.getByTestId('input-kendra-index-id')).toBeDefined();
        const kendraIndexIdInput = createWrapper(screen.getByTestId('input-kendra-index-id')).findInput();
        kendraIndexIdInput?.setInputValue('fake-kendra-index-id');
        kendraIndexIdInput?.setInputValue('');
        kendraIndexIdInput?.setInputValue('fake-kendra-index-id');

        exitingKendraIndexRadioGroup?.findInputByValue('No')?.click();
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

        // display source doc radio button
        expect(screen.getByTestId('display-document-source-field')).toBeDefined();
        const displaySourceDocElement = screen.getByTestId('display-document-source-field');
        const displaySourceDocElementRadioGroup = createWrapper(displaySourceDocElement).findRadioGroup();
        displaySourceDocElementRadioGroup?.findInputByValue('true')?.click();

        // step 5: prompt
        wizardWrapper?.findPrimaryButton().click();
        expect(wizardWrapper?.findMenuNavigationLink(5, 'active')).not.toBeNull();

        // step 6: review
        wizardWrapper?.findPrimaryButton().click();
        expect(wizardWrapper?.findMenuNavigationLink(6, 'active')).not.toBeNull();

        const reviewElement = screen.getByTestId('review-deployment-component');
        expect(reviewElement).toBeDefined();

        const useCaseDetailsReviewComponent = screen.getByTestId('review-use-case-details');
        expect(useCaseDetailsReviewComponent).toBeDefined();
        const useCaseDetailsReviewComponentHtml = createWrapper(useCaseDetailsReviewComponent)?.getElement().innerHTML;
        expect(useCaseDetailsReviewComponentHtml).toContain('fake-use-case-name');
        expect(useCaseDetailsReviewComponentHtml).toContain('fake-use-case-description-name');
        expect(useCaseDetailsReviewComponentHtml).toContain('Text');

        const submitButton = await screen.findByRole('button', { name: 'Deploy use case' });
        expect(submitButton).toBeDefined();

        wizardWrapper?.findPrimaryButton().click();
        const deployComponentModal = screen.getByTestId('confirm-deployment-modal');
        expect(deployComponentModal).toBeDefined();

        expect(createWrapper(deployComponentModal).findButton('Cancel')).toBeDefined();
        expect(createWrapper(deployComponentModal).findButton('Deploy')).toBeDefined();

        // prettier-ignore
        expect(createWrapper(screen.getByTestId('internal-user-disclaimer-alert'))?.findBox()?.getElement().innerHTML).toContain('href="https://policy.a2z.com/docs/568686/publication');

        expect(screen.getByRole('link', { name: 'internal user policy document' })).toHaveAttribute(
            'href',
            INTERNAL_USER_GENAI_POLICY_URL
        );

        const deployButton = createWrapper(deployComponentModal).findButton(
            '[data-testid="confirm-deployment-modal-submit-btn"]'
        );
        expect(deployButton).toBeDefined();
        deployButton?.click();
        deployButton?.click();

        await waitFor(async () => {
            expect(mockAPI.post).toHaveBeenCalledTimes(1);
        });
        expect(mockAPI.post).toHaveBeenCalledWith(API_NAME, '/deployments', {
            body: {
                ConversationMemoryParams: {
                    ConversationMemoryType: 'DynamoDB',
                    AiPrefix: undefined,
                    ChatHistoryLength: undefined,
                    HumanPrefix: undefined
                },
                DeployUI: true,
                DefaultUserEmail: 'correct_email@example.com',
                KnowledgeBaseParams: {
                    KendraKnowledgeBaseParams: {
                        KendraIndexEdition: 'ENTERPRISE_EDITION',
                        KendraIndexName: 'fake-kendra-index-name',
                        QueryCapacityUnits: 1,
                        StorageCapacityUnits: 1,
                        RoleBasedAccessControlEnabled: false
                    },
                    KnowledgeBaseType: 'Kendra',
                    NoDocsFoundResponse: undefined,
                    NumberOfDocs: 3,
                    ScoreThreshold: 0,
                    ReturnSourceDocs: false
                },

                LlmParams: {
                    BedrockLlmParams: {
                        ModelId: 'amazon.titan-text-express-v1'
                    },
                    ModelParams: {},
                    ModelProvider: 'Bedrock',
                    PromptParams: {
                        UserPromptEditingEnabled: true,
                        DisambiguationEnabled: undefined,
                        DisambiguationPromptTemplate: undefined,
                        MaxInputTextLength: undefined,
                        MaxPromptTemplateLength: undefined,
                        PromptTemplate: undefined,
                        RephraseQuestion: undefined
                    },
                    RAGEnabled: true,
                    Streaming: false,
                    Temperature: 0.25,
                    Verbose: true
                },
                VpcParams: {
                    VpcEnabled: false
                },
                UseCaseDescription: 'fake-use-case-description-name',
                UseCaseName: 'fake-use-case-name',
                UseCaseType: 'Text'
            },
            headers: {
                Authorization: 'fake-token'
            }
        });
        const flashBarWrapper = createWrapper(reviewElement)?.findFlashbar();
        expect(flashBarWrapper).toBeDefined();
        setTimeout(() => {
            expect(screen?.getByTestId('dashboard-view')).toBeDefined();
        }, DELAY_AFTER_SUCCESS_DEPLOYMENT);
    });
});
