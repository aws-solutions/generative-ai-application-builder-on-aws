// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import WorkflowReview from '../WorkflowReview';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

// Mock the child components
vi.mock('../../Review/UseCaseReview', () => ({
    default: ({ header, useCaseData, setActiveStepIndex }: any) => (
        <div data-testid="use-case-review">
            <h3>{header}</h3>
            <div data-testid="use-case-data">{JSON.stringify(useCaseData)}</div>
            <button onClick={() => setActiveStepIndex(0)}>Edit Use Case</button>
        </div>
    )
}));

vi.mock('../../Review/ModelReview', () => ({
    default: ({ header, modelData, knowledgeBaseData, useCaseData, setActiveStepIndex }: any) => (
        <div data-testid="model-review">
            <h3>{header}</h3>
            <div data-testid="model-data">{JSON.stringify(modelData)}</div>
            <div data-testid="knowledge-base-data">{JSON.stringify(knowledgeBaseData)}</div>
            <button onClick={() => setActiveStepIndex(1)}>Edit Model</button>
        </div>
    )
}));

vi.mock('../WorkflowConfigReview', () => ({
    WorkflowConfigReview: ({ header, workflowData, setActiveStepIndex }: any) => (
        <div data-testid="workflow-config-review">
            <h3>{header}</h3>
            <div data-testid="workflow-data">{JSON.stringify(workflowData)}</div>
            <button onClick={() => setActiveStepIndex(2)}>Edit Workflow</button>
        </div>
    )
}));

const mockWorkflowReviewData = {
    useCase: {
        useCaseType: 'Workflow',
        useCaseName: 'Test Workflow',
        useCaseDescription: 'A test workflow use case',
        defaultUserEmail: 'test@example.com',
        deployUI: true,
        feedbackEnabled: false,
        provisionedConcurrencyValue: 0
    },
    model: {
        modelProvider: { label: 'Amazon Bedrock', value: 'Bedrock' },
        modelName: 'claude-3-sonnet',
        temperature: 0.7,
        enableGuardrails: false,
        verbose: false,
        streaming: true,
        modelParameters: []
    },
    workflow: {
        systemPrompt: 'You are a helpful AI assistant for workflow management.',
        memoryEnabled: true,
        orchestrationPattern: 'SUPERVISOR',
        selectedAgents: [
            {
                useCaseId: 'agent-1',
                useCaseName: 'Data Analysis Agent',
                useCaseDescription: 'Analyzes data and provides insights'
            },
            {
                useCaseId: 'agent-2',
                useCaseName: 'Report Generator Agent',
                useCaseDescription: 'Generates comprehensive reports'
            }
        ]
    }
};

describe('WorkflowReview', () => {
    const mockSetActiveStepIndex = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders main container with correct data-testid', () => {
        renderWithProvider(
            <WorkflowReview
                info={mockWorkflowReviewData}
                setActiveStepIndex={mockSetActiveStepIndex}
                onChange={vi.fn()}
                setHelpPanelContent={vi.fn()}
            />,
            {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            }
        );

        expect(screen.getByTestId('review-deployment-component')).toBeDefined();
    });

    test('renders all three review sections', () => {
        renderWithProvider(
            <WorkflowReview
                info={mockWorkflowReviewData}
                setActiveStepIndex={mockSetActiveStepIndex}
                onChange={vi.fn()}
                setHelpPanelContent={vi.fn()}
            />,
            {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            }
        );

        expect(screen.getByTestId('use-case-review')).toBeDefined();
        expect(screen.getByTestId('model-review')).toBeDefined();
        expect(screen.getByTestId('workflow-config-review')).toBeDefined();
    });

    test('passes correct props to UseCaseReview component', () => {
        renderWithProvider(
            <WorkflowReview
                info={mockWorkflowReviewData}
                setActiveStepIndex={mockSetActiveStepIndex}
                onChange={vi.fn()}
                setHelpPanelContent={vi.fn()}
            />,
            {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            }
        );

        expect(screen.getByText('Step 1: Use case')).toBeDefined();
        expect(screen.getByTestId('use-case-data')).toHaveTextContent(JSON.stringify(mockWorkflowReviewData.useCase));
    });

    test('passes correct props to ModelReview component', () => {
        renderWithProvider(
            <WorkflowReview
                info={mockWorkflowReviewData}
                setActiveStepIndex={mockSetActiveStepIndex}
                onChange={vi.fn()}
                setHelpPanelContent={vi.fn()}
            />,
            {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            }
        );

        expect(screen.getByText('Step 2: Model')).toBeDefined();
        expect(screen.getByTestId('model-data')).toHaveTextContent(JSON.stringify(mockWorkflowReviewData.model));
        expect(screen.getByTestId('knowledge-base-data')).toHaveTextContent('{}');
    });

    test('passes correct props to WorkflowConfigReview component', () => {
        renderWithProvider(
            <WorkflowReview
                info={mockWorkflowReviewData}
                setActiveStepIndex={mockSetActiveStepIndex}
                onChange={vi.fn()}
                setHelpPanelContent={vi.fn()}
            />,
            {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            }
        );

        expect(screen.getByText('Step 3: Workflow Configuration')).toBeDefined();
        expect(screen.getByTestId('workflow-data')).toHaveTextContent(JSON.stringify(mockWorkflowReviewData.workflow));
    });

    test('setActiveStepIndex is called when edit buttons are clicked', () => {
        renderWithProvider(
            <WorkflowReview
                info={mockWorkflowReviewData}
                setActiveStepIndex={mockSetActiveStepIndex}
                onChange={vi.fn()}
                setHelpPanelContent={vi.fn()}
            />,
            {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            }
        );

        // Click edit buttons for each section
        const editUseCaseButton = screen.getByText('Edit Use Case');
        const editModelButton = screen.getByText('Edit Model');
        const editWorkflowButton = screen.getByText('Edit Workflow');

        editUseCaseButton.click();
        expect(mockSetActiveStepIndex).toHaveBeenCalledWith(0);

        editModelButton.click();
        expect(mockSetActiveStepIndex).toHaveBeenCalledWith(1);

        editWorkflowButton.click();
        expect(mockSetActiveStepIndex).toHaveBeenCalledWith(2);
    });

    test('renders with minimal data', () => {
        const minimalData = {
            useCase: {},
            model: {},
            workflow: {}
        };

        renderWithProvider(
            <WorkflowReview
                info={minimalData}
                setActiveStepIndex={mockSetActiveStepIndex}
                onChange={vi.fn()}
                setHelpPanelContent={vi.fn()}
            />,
            {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            }
        );

        expect(screen.getByTestId('review-deployment-component')).toBeDefined();
        expect(screen.getByTestId('use-case-review')).toBeDefined();
        expect(screen.getByTestId('model-review')).toBeDefined();
        expect(screen.getByTestId('workflow-config-review')).toBeDefined();
    });

    test('renders with undefined workflow data', () => {
        const dataWithUndefinedWorkflow = {
            useCase: mockWorkflowReviewData.useCase,
            model: mockWorkflowReviewData.model,
            workflow: undefined
        };

        renderWithProvider(
            <WorkflowReview
                info={dataWithUndefinedWorkflow}
                setActiveStepIndex={mockSetActiveStepIndex}
                onChange={vi.fn()}
                setHelpPanelContent={vi.fn()}
            />,
            {
                route: USECASE_TYPE_ROUTE.WORKFLOW
            }
        );

        expect(screen.getByTestId('review-deployment-component')).toBeDefined();
        expect(screen.getByTestId('workflow-config-review')).toBeDefined();
    });
});
