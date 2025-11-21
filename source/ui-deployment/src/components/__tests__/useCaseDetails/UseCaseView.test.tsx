/* eslint-disable import/first */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Dispatch } from 'react';

import createWrapper from '@cloudscape-design/components/test-utils/dom';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { HomeInitialState } from '../../../contexts/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import UseCaseView from '../../useCaseDetails/UseCaseView';

import { baseMock } from '../__mocks__/mock-context-variants.js';

import { createCfnLink } from '../../commons/table-config';
import { createVpcLink, mockReactMarkdown, renderWithMultipleRoutes, renderWithProvider } from '@/utils';
import { act } from 'react-test-renderer';
import { TextUseCaseType } from '@/components/wizard/interfaces/UseCaseTypes/Text';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';
import { createAgentLink } from '@/components/useCaseDetails/agent/AgentDetails';
import WizardView from '../../wizard/WizardView';
import { useUseCaseDetailsQuery } from '@/hooks/useQueries';
import {
    agentDetailsApiResponse,
    bedrockKnowledgeBaseResponse,
    kendraKnowledgeBaseResponse,
    nonRagResponse,
    nonRagWithVpc,
    sagemakerNonRagResponse
} from '../__mocks__/mock-details-api-response';

vi.mock('../../wizard/WizardView', () => ({
    default: ({ useCase }: any) => <div data-testid="wizard-view">Mocked WizardView</div>
}));

vi.mock('../../useCaseDetails/export/ExportDropdownButton', () => ({
    ExportButtonDropdown: ({ useCaseId, disabled }: any) => (
        <div data-testid="export-button-dropdown">Export Button (Mocked)</div>
    )
}));

vi.mock('@/hooks/useQueries', async () => {
    const actual = await vi.importActual('@/hooks/useQueries');
    return {
        ...actual,
        useUseCaseDetailsQuery: vi.fn()
    };
});

function mockUseCaseDetailsQuery(data: any) {
    vi.mocked(useUseCaseDetailsQuery).mockReturnValue({
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        data: data,
        refetch: vi.fn(),
        status: 'success'
    } as any);
}

describe('UseCaseView', () => {
    const contextValue = {
        dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: baseMock
    };

    beforeAll(() => {
        mockReactMarkdown();
    });

    beforeEach(() => {
        mockUseCaseDetailsQuery(nonRagResponse);
    });

    afterEach(() => {
        vi.resetAllMocks();
        cleanup();
    });
    
    test('Shows error alert when there is an error loading data', async () => {
        vi.mocked(useUseCaseDetailsQuery).mockReturnValue({
            isLoading: false,
            isError: true,
            isSuccess: false,
            error: new Error('Failed to load'),
            data: null,
            refetch: vi.fn(),
            status: 'error'
        } as any);
        
        renderWithProvider(<UseCaseView />, { route: '/deployment-details/:useCaseId' });
        
        const errorAlert = screen.getByTestId('use-case-view-error');
        expect(errorAlert).toBeDefined();
        expect(errorAlert).toHaveTextContent('Unable to load deployment details.');
    });

    test('The initial state is correct', async () => {
        renderWithProvider(<UseCaseView />, { route: '/deployment-details/:useCaseId' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const editButton = screen.getByTestId('use-case-view-edit-btn');
        expect(editButton).toBeDefined();
    });

    test('General config container is rendered correctly', async () => {
        renderWithProvider(<UseCaseView />, { route: '/deployment-details/:useCaseId' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const modelTab = screen.getByTestId('deployment-details-container');
        expect(modelTab).toBeDefined();

        expect(screen.getByRole('link', { name: nonRagResponse.cloudFrontWebUrl })).toHaveAttribute(
            'href',
            nonRagResponse.cloudFrontWebUrl
        );

        createWrapper(screen.getByTestId('cfn-link-with-modal')).findLink()?.click();
        const externalLinkWarningModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkWarningModal).toBeDefined();
        const openCfnLinkButton = createWrapper(externalLinkWarningModal).findButton(
            '[data-testid="external-link-warning-modal-open-button"]'
        );

        expect(openCfnLinkButton).toBeDefined();
        expect(openCfnLinkButton?.getElement().getAttribute('href')).toEqual(createCfnLink(nonRagResponse.StackId));
    });

    test('General config container is rendered with VPC ID link', async () => {
        mockUseCaseDetailsQuery(nonRagWithVpc);
        // Render the component
        renderWithProvider(<UseCaseView />, { route: '/deployment-details/:useCaseId' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const vpcLink = screen.getByTestId('vpc-link-with-modal');
        expect(vpcLink).toBeDefined();

        createWrapper(vpcLink).findLink()?.click();

        const externalLinkWarningModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkWarningModal).toBeDefined();

        const openVpcLinkButton = createWrapper(externalLinkWarningModal).findButton(
            '[data-testid="external-link-warning-modal-open-button"]'
        );

        // Verify the button exists and has the correct href
        expect(openVpcLinkButton).toBeDefined();
        expect(openVpcLinkButton?.getElement().getAttribute('href')).toEqual(
            createVpcLink(baseMock.runtimeConfig.AwsRegion, 'fake-11111111')
        );
    });

    test('Model details tab is rendered for Bedrock', async () => {
        renderWithProvider(<UseCaseView />, { route: '/deployment-details/:useCaseId' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const modelTab = screen.getByTestId('model-details-tab');
        expect(modelTab).toBeDefined();

        const modelParams = screen.getByTestId('model-params-container');
        expect(modelParams).toBeDefined();
    });

    test('Model details tab is rendered for SageMaker', async () => {
        mockUseCaseDetailsQuery(sagemakerNonRagResponse);
        renderWithProvider(<UseCaseView />, {
            // customState: selectedSageMakerProvider,
            route: '/deployment-details/:useCaseId'
        });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const modelTab = screen.getByTestId('model-details-tab');
        expect(modelTab).toBeDefined();

        const modelParams = screen.getByTestId('model-params-container');
        expect(modelParams).toBeDefined();
    });

    test('KB details tab renders when RAG is disabled', async () => {
        renderWithProvider(<UseCaseView />, { route: '/deployment-details/:useCaseId' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        act(() => {
            createWrapper(element).findTabs()?.findTabLinkById('knowledgeBase')?.click();
        });

        const kbTab = screen.getByTestId('kb-disabled-tab');
        expect(kbTab).toBeDefined();
    });

    test('KB details tab renders when Kendra RAG is enabled', async () => {
        mockUseCaseDetailsQuery(kendraKnowledgeBaseResponse);

        const { debug } = renderWithProvider(<UseCaseView />, {
            route: '/deployment-details/:useCaseId'
        });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        createWrapper(element).findTabs()?.findTabLinkById('knowledgeBase')?.click();

        const kbTab = screen.getByTestId('knowledge-base-details-container');
        expect(kbTab).toBeDefined();
    });

    test('KB details tab renders when Bedrock RAG is enabled', async () => {
        mockUseCaseDetailsQuery(bedrockKnowledgeBaseResponse);

        renderWithProvider(<UseCaseView />, {
            route: '/deployment-details/:useCaseId'
        });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        createWrapper(element).findTabs()?.findTabLinkById('knowledgeBase')?.click();

        const kbTab = screen.getByTestId('knowledge-base-details-container');
        expect(kbTab).toBeDefined();
    });

    test('Agent details tab is rendered for agent use case', async () => {
        mockUseCaseDetailsQuery(agentDetailsApiResponse);
        renderWithProvider(<UseCaseView />, { route: '/deployment-details/:useCaseId' });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        const modelTab = screen.getByTestId('agent-details-container');
        expect(modelTab).toBeDefined();

        createWrapper(screen.getByTestId('agent-link-with-modal')).findLink()?.click();
        const externalLinkWarningModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkWarningModal).toBeDefined();
        const openAgentLinkButton = createWrapper(externalLinkWarningModal).findButton(
            '[data-testid="external-link-warning-modal-open-button"]'
        );

        expect(openAgentLinkButton).toBeDefined();
        expect(openAgentLinkButton?.getElement().getAttribute('href')).toEqual(
            createAgentLink(
                agentDetailsApiResponse.StackId,
                agentDetailsApiResponse.AgentParams.BedrockAgentParams.AgentId
            )
        );
    });
});

describe('Navigating to edit/clone from UseCaseView', () => {
    const contextValue = {
        dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: baseMock
    };

    beforeAll(() => {
        mockReactMarkdown();
    });

    beforeEach(() => {
        mockUseCaseDetailsQuery(bedrockKnowledgeBaseResponse);
    });

    afterEach(() => {
        vi.resetAllMocks();
        cleanup();
    });

    test('The edit wizard is correctly rendered', async () => {
        renderWithMultipleRoutes({
            initialRoute: '/deployment-details/:useCaseId',
            routes: [
                { path: '/deployment-details/:useCaseId', element: <UseCaseView /> },
                {
                    path: `${USECASE_TYPE_ROUTE.TEXT}`,
                    element: <WizardView useCase={new TextUseCaseType()} />
                }
            ],
            customState: contextValue.state
        });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        createWrapper(element).findButton('[data-testid="use-case-view-edit-btn"]')?.click();

        const editWizard = screen.getByTestId('wizard-view');
        expect(editWizard).toBeDefined();

        const wizardWrapper = createWrapper(editWizard).findWizard();

        // step 1
        expect(wizardWrapper?.findMenuNavigationLink(1, 'active')).not.toBeNull();

        wizardWrapper?.findPrimaryButton().click();
    });

    test('The clone wizard is correctly rendered', async () => {
        renderWithMultipleRoutes({
            initialRoute: '/deployment-details/:useCaseId',
            routes: [
                { path: '/deployment-details/:useCaseId', element: <UseCaseView /> },
                {
                    path: `${USECASE_TYPE_ROUTE.TEXT}`,
                    element: <WizardView useCase={new TextUseCaseType()} />
                }
            ],
            customState: contextValue.state
        });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();

        createWrapper(element).findButton('[data-testid="use-case-view-clone-btn"]')?.click();

        const cloneWizard = screen.getByTestId('wizard-view');
        expect(cloneWizard).toBeDefined();

        const wizardWrapper = createWrapper(cloneWizard).findWizard();

        // step 1
        expect(wizardWrapper?.findMenuNavigationLink(1, 'active')).not.toBeNull();
        wizardWrapper?.findPrimaryButton().click();
    });

    test('Delete button is disabled when status is CREATE_IN_PROGRESS', async () => {
        mockUseCaseDetailsQuery({
            ...bedrockKnowledgeBaseResponse,
            Status: 'CREATE_IN_PROGRESS'
        });
        renderWithMultipleRoutes({
            initialRoute: '/deployment-details/:useCaseId',
            routes: [
                { path: '/deployment-details/:useCaseId', element: <UseCaseView /> },
                {
                    path: `${USECASE_TYPE_ROUTE.TEXT}`,
                    element: <WizardView useCase={new TextUseCaseType()} />
                }
            ],
            customState: contextValue.state
        });

        const element = screen.getByTestId('use-case-view');
        expect(element).toBeDefined();
        expect(createWrapper(element).findButton('[data-testid="use-case-view-delete-btn"]')?.isDisabled()).toBe(true);
    });
});
