/* eslint-disable import/first */
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
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomeContext from '../../../contexts/home.context';
import { HomeInitialState } from '../../../contexts/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import UseCaseView from '../../useCaseDetails/UseCaseView';

import {
    baseMock,
    selectedRAGEnabledWithKendra,
    selectedRAGEnabledWithBedrock,
    selectedSageMakerProvider
} from '../__mocks__/mock-context-variants.js';

import { createCfnLink } from '../../commons/table-config';
import { mockReactMarkdown, renderWithProvider } from '@/utils';
import { act } from 'react-test-renderer';

describe('UseCaseView', () => {
    let WizardView: any;
    const contextValue = {
        dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: baseMock
    };

    beforeAll(async () => {
        mockReactMarkdown();
        WizardView = (await import('../../wizard/WizardView')).default;
    });

    afterEach(() => {
        cleanup();
    });

    test('The initial state is correct', async () => {
        renderWithProvider(<UseCaseView />, { route: '/deployment-details' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const editButton = screen.getByTestId('use-case-view-edit-btn');
        expect(editButton).toBeDefined();
    });

    test('General config container is rendered correctly', async () => {
        renderWithProvider(<UseCaseView />, { route: '/deployment-details' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const modelTab = screen.getByTestId('deployment-details-container');
        expect(modelTab).toBeDefined();

        expect(screen.getByRole('link', { name: baseMock.selectedDeployment.cloudFrontWebUrl })).toHaveAttribute(
            'href',
            baseMock.selectedDeployment.cloudFrontWebUrl
        );

        createWrapper(screen.getByTestId('cfn-link-with-modal')).findLink()?.click();
        const externalLinkWarningModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkWarningModal).toBeDefined();
        const openCfnLinkButton = createWrapper(externalLinkWarningModal).findButton(
            '[data-testid="external-link-warning-modal-open-button"]'
        );

        expect(openCfnLinkButton).toBeDefined();
        expect(openCfnLinkButton?.getElement().getAttribute('href')).toEqual(
            createCfnLink(baseMock.selectedDeployment.StackId)
        );
    });

    test('Model details tab is rendered for Bedrock', async () => {
        renderWithProvider(<UseCaseView />, { route: '/deployment-details' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const modelTab = screen.getByTestId('model-details-tab');
        expect(modelTab).toBeDefined();

        const modelParams = screen.getByTestId('model-params-container');
        expect(modelParams).toBeDefined();
    });

    test('Model details tab is rendered for SageMaker', async () => {
        renderWithProvider(<UseCaseView />, { customState: selectedSageMakerProvider, route: '/deployment-details' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const modelTab = screen.getByTestId('model-details-tab');
        expect(modelTab).toBeDefined();

        const modelParams = screen.getByTestId('model-params-container');
        expect(modelParams).toBeDefined();
    });

    test('KB details tab renders when RAG is disabled', async () => {
        renderWithProvider(<UseCaseView />, { route: '/deployment-details' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        act(() => {
            createWrapper(element).findTabs()?.findTabLinkById('knowledgeBase')?.click();
        });

        const kbTab = screen.getByTestId('kb-disabled-tab');
        expect(kbTab).toBeDefined();
    });
    test('KB details tab renders when Kendra RAG is enabled', async () => {
        renderWithProvider(<UseCaseView />, {
            customState: selectedRAGEnabledWithKendra,
            route: '/deployment-details'
        });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        act(() => {
            createWrapper(element).findTabs()?.findTabLinkById('knowledgeBase')?.click();
        });

        const kbTab = screen.getByTestId('kb-details-tab');
        expect(kbTab).toBeDefined();

        const kbSettingsTab = screen.getByTestId('kb-settings-tab');
        expect(kbSettingsTab).toBeDefined();
    });

    test('KB details tab renders when Bedrock RAG is enabled', async () => {
        renderWithProvider(<UseCaseView />, {
            customState: selectedRAGEnabledWithBedrock,
            route: '/deployment-details'
        });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        act(() => {
            createWrapper(element).findTabs()?.findTabLinkById('knowledgeBase')?.click();
        });

        const kbTab = screen.getByTestId('kb-details-tab');
        expect(kbTab).toBeDefined();

        const kbSettingsTab = screen.getByTestId('kb-settings-tab');
        expect(kbSettingsTab).toBeDefined();
    });
});

describe('Navigating to edit/clone from UseCaseView', () => {
    let WizardView: any;
    const contextValue = {
        dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: baseMock
    };

    beforeAll(async () => {
        mockReactMarkdown();
        WizardView = (await import('../../wizard/WizardView')).default;
    });

    test('The edit wizard is correctly rendered', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/deployment-details']}>
                    <Routes>
                        <Route path="/deployment-details" element={<UseCaseView />} />
                        <Route path="/wizardView" element={<WizardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        createWrapper(element).findButton('[data-testid="use-case-view-edit-btn"]')?.click();

        const editWizard = screen.getByTestId('wizard-view');
        expect(editWizard).toBeDefined();

        const wizardWrapper = createWrapper(editWizard).findWizard();

        // step 1
        expect(wizardWrapper?.findMenuNavigationLink(1, 'active')).not.toBeNull();

        act(() => {
            wizardWrapper?.findPrimaryButton().click();
        });
    });

    test('The clone wizard is correctly rendered', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/deployment-details']}>
                    <Routes>
                        <Route path="/deployment-details" element={<UseCaseView />} />
                        <Route path="/wizardView" element={<WizardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        createWrapper(element).findButton('[data-testid="use-case-view-clone-btn"]')?.click();

        const cloneWizard = screen.getByTestId('wizard-view');
        expect(cloneWizard).toBeDefined();

        const wizardWrapper = createWrapper(cloneWizard).findWizard();

        // step 1
        expect(wizardWrapper?.findMenuNavigationLink(1, 'active')).not.toBeNull();
        wizardWrapper?.findPrimaryButton().click();

        act(() => {
            wizardWrapper?.findPrimaryButton().click();
        });
    });
});
