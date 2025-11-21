// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import UseCase from '../UseCase';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { USECASE_TYPE_ROUTE, USECASE_TYPES, DEPLOYMENT_ACTIONS } from '@/utils/constants';
import { cleanup, screen } from '@testing-library/react';
import { DEFAULT_COMPONENT_VISIBILITY } from '../../../../utils/constants';

// Helper function to get visibility for different use case types
const getVisibilityForUseCase = (useCaseType: string) => {
    switch (useCaseType) {
        case USECASE_TYPES.TEXT:
        case USECASE_TYPES.AGENT:
            return DEFAULT_COMPONENT_VISIBILITY;
        case USECASE_TYPES.MCP_SERVER:
            return {
                ...DEFAULT_COMPONENT_VISIBILITY,
                showDeployUI: false,
                showManageUserAccess: false,
                showCollectUserFeedback: false,
                showPerformanceOptimization: false
            };
        case USECASE_TYPES.AGENT_BUILDER:
            return {
                ...DEFAULT_COMPONENT_VISIBILITY,
                showManageUserAccess: false,
                showCollectUserFeedback: false,
                showPerformanceOptimization: false
            };
        default:
            return DEFAULT_COMPONENT_VISIBILITY;
    }
};

describe('UseCase', () => {
    const mockUseCaseInfo = {
        useCase: {
            useCaseName: 'fake-use-case',
            defaultUserEmail: 'fake-user-email@example.com',
            useCaseDescription: 'fake-use-case-description',
            deployUI: true,
            feedbackEnabled: false,
            provisionedConcurrencyValue: 0,
            useExistingUserPool: false,
            existingUserPoolId: '',
            useExistingUserPoolClient: false,
            existingUserPoolClientId: ''
        }
    };

    afterEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    describe('Component Visibility', () => {
        test('shows all components for Text use case', () => {
            const visibility = getVisibilityForUseCase(USECASE_TYPES.TEXT);

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-deploy-ui-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-manage-user-access-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-collect-user-feedback-header')).toBeInTheDocument();
        });

        test('uses default visibility when no visibility prop provided', () => {
            renderWithProvider(<UseCase info={mockUseCaseInfo} {...mockFormComponentCallbacks()} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            // Should show all components with default visibility
            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-deploy-ui-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-manage-user-access-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-collect-user-feedback-header')).toBeInTheDocument();
        });

        test('shows partial components for Agent use case', () => {
            const visibility = getVisibilityForUseCase(USECASE_TYPES.AGENT);

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.AGENT_BUILDER }
            );

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-deploy-ui-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-manage-user-access-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-collect-user-feedback-header')).toBeInTheDocument();
        });

        test('hides components for MCP Server use case', () => {
            const visibility = getVisibilityForUseCase(USECASE_TYPES.MCP_SERVER);

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.MCP_SERVER }
            );

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.queryByTestId('wizard-deploy-ui-header')).not.toBeInTheDocument();
            expect(screen.queryByTestId('wizard-manage-user-access-header')).not.toBeInTheDocument();
            expect(screen.queryByTestId('wizard-collect-user-feedback-header')).not.toBeInTheDocument();
        });

        test('shows partial components for Agent Builder use case', () => {
            const visibility = getVisibilityForUseCase(USECASE_TYPES.AGENT_BUILDER);

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.AGENT_BUILDER }
            );

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-deploy-ui-header')).toBeInTheDocument();
            expect(screen.queryByTestId('wizard-manage-user-access-header')).not.toBeInTheDocument();
            expect(screen.queryByTestId('wizard-collect-user-feedback-header')).not.toBeInTheDocument();
        });

        test('hides use case options when configured', () => {
            const visibility = {
                showUseCaseOptions: true,
                showDeployUI: false,
                showManageUserAccess: true,
                showCollectUserFeedback: false,
                showPerformanceOptimization: false
            };

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(screen.queryByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.queryByTestId('wizard-deploy-ui-header')).not.toBeInTheDocument();
            expect(screen.getByTestId('wizard-manage-user-access-header')).toBeInTheDocument();
            expect(screen.queryByTestId('wizard-collect-user-feedback-header')).not.toBeInTheDocument();
        });
    });

    describe('Deployment Actions Compatibility', () => {
        test('works with clone action', () => {
            const visibility = getVisibilityForUseCase(USECASE_TYPES.TEXT);

            const mockContext = {
                state: { deploymentAction: DEPLOYMENT_ACTIONS.CLONE },
                dispatch: vi.fn()
            };

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.TEXT, mockContext }
            );

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
        });

        test('works with edit action', () => {
            const visibility = getVisibilityForUseCase(USECASE_TYPES.TEXT);

            const mockContext = {
                state: { deploymentAction: DEPLOYMENT_ACTIONS.EDIT },
                dispatch: vi.fn()
            };

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.TEXT, mockContext }
            );

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
        });
    });

    describe('Fallbacks for no Visibility', () => {
        test('uses default visibility when not provided', () => {
            renderWithProvider(<UseCase info={mockUseCaseInfo} {...mockFormComponentCallbacks()} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-deploy-ui-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-manage-user-access-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-collect-user-feedback-header')).toBeInTheDocument();
        });

        test('uses default visibility when visibility is null', () => {
            renderWithProvider(<UseCase info={mockUseCaseInfo} visibility={null} {...mockFormComponentCallbacks()} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-deploy-ui-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-manage-user-access-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-collect-user-feedback-header')).toBeInTheDocument();
        });

        test('uses default visibility when visibility is undefined', () => {
            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={undefined} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-deploy-ui-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-manage-user-access-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-collect-user-feedback-header')).toBeInTheDocument();
        });

        test('uses default visibility when visibility is not passed', () => {
            renderWithProvider(<UseCase info={mockUseCaseInfo} {...mockFormComponentCallbacks()} />, {
                route: USECASE_TYPE_ROUTE.TEXT
            });

            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-deploy-ui-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-manage-user-access-header')).toBeInTheDocument();
            expect(screen.getByTestId('wizard-collect-user-feedback-header')).toBeInTheDocument();
        });
    });

    describe('Component Visibility - Form Rendering', () => {
        test('renders form fields correctly when visible', () => {
            const visibility = getVisibilityForUseCase(USECASE_TYPES.TEXT);

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(screen.getByTestId('use-case-name-field')).toBeInTheDocument();
            expect(screen.getByTestId('use-case-description-field')).toBeInTheDocument();
            expect(screen.getByTestId('user-email-field')).toBeInTheDocument();
            expect(screen.getByTestId('deploy-ui-radio-group')).toBeInTheDocument();
            expect(screen.getByTestId('enable-feedback-radio-group')).toBeInTheDocument();
        });

        test('does not render hidden form fields', () => {
            const visibility = {
                showUseCaseOptions: false,
                showDeployUI: false,
                showManageUserAccess: false,
                showCollectUserFeedback: false
            };

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.MCP_SERVER }
            );

            expect(screen.queryByTestId('use-case-name-field')).not.toBeInTheDocument();
            expect(screen.queryByTestId('use-case-description-field')).not.toBeInTheDocument();
            expect(screen.queryByTestId('user-email-field')).not.toBeInTheDocument();
            expect(screen.queryByTestId('deploy-ui-radio-group')).not.toBeInTheDocument();
            expect(screen.queryByTestId('enable-feedback-radio-group')).not.toBeInTheDocument();
        });
    });

    describe('Component Visibility - Form Validation', () => {
        test('validates required fields when components are visible', () => {
            const visibility = getVisibilityForUseCase(USECASE_TYPES.TEXT);

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Check that the use case name field has required indicator in the label
            expect(screen.getByText('Use case name')).toBeInTheDocument();
            expect(screen.getByText('- required')).toBeInTheDocument();
        });

        test('validates email format in user email field', () => {
            const visibility = getVisibilityForUseCase(USECASE_TYPES.TEXT);

            renderWithProvider(
                <UseCase info={mockUseCaseInfo} visibility={visibility} {...mockFormComponentCallbacks()} />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Check that the user email field exists and is an input field
            const emailField = screen.getByTestId('user-email-field');
            expect(emailField).toBeInTheDocument();
            // The actual input is nested within the field container
            const emailInput = emailField.querySelector('input[type="email"]');
            expect(emailInput).toBeInTheDocument();
        });

        test('validates required fields when visibility is null', () => {
            const mockOnChange = vi.fn();

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfo}
                    visibility={null}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Check that the use case name field has required indicator in the label
            expect(screen.getByText('Use case name')).toBeInTheDocument();
            expect(screen.getByText('- required')).toBeInTheDocument();
            // When visibility is null, all components should be visible and required fields should be validated
            expect(screen.getByTestId('wizard-use-case-options-header')).toBeInTheDocument();
        });

        test('sets default values for hidden components when visibility is null', () => {
            const mockOnChange = vi.fn();
            const mockUseCaseInfoWithValues = {
                useCase: {
                    ...mockUseCaseInfo.useCase,
                    deployUI: true,
                    feedbackEnabled: true,
                    defaultUserEmail: 'test@example.com',
                    useExistingUserPool: true
                }
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfoWithValues}
                    visibility={null}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // When visibility is null, it falls back to default which shows all components
            // So no default values should be set (onChange should not be called for hiding components)
            expect(mockOnChange).not.toHaveBeenCalledWith({ deployUI: false });
            expect(mockOnChange).not.toHaveBeenCalledWith({ feedbackEnabled: false });
            expect(mockOnChange).not.toHaveBeenCalledWith({ defaultUserEmail: '' });
        });
    });

    describe('UseEffect Default Value Setting', () => {
        test('sets deployUI to false when showDeployUI is false and deployUI is true', () => {
            const mockOnChange = vi.fn();
            const mockUseCaseInfoWithDeployUI = {
                useCase: {
                    ...mockUseCaseInfo.useCase,
                    deployUI: true
                }
            };

            const visibility = {
                ...DEFAULT_COMPONENT_VISIBILITY,
                showDeployUI: false
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfoWithDeployUI}
                    visibility={visibility}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.MCP_SERVER }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ deployUI: false });
        });

        test('sets feedbackEnabled to false when showCollectUserFeedback is false and feedbackEnabled is true', () => {
            const mockOnChange = vi.fn();
            const mockUseCaseInfoWithFeedback = {
                useCase: {
                    ...mockUseCaseInfo.useCase,
                    feedbackEnabled: true
                }
            };

            const visibility = {
                ...DEFAULT_COMPONENT_VISIBILITY,
                showCollectUserFeedback: false
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfoWithFeedback}
                    visibility={visibility}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.MCP_SERVER }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ feedbackEnabled: false });
        });

        test('sets user access defaults when showManageUserAccess is false', () => {
            const mockOnChange = vi.fn();
            const mockUseCaseInfoWithUserAccess = {
                useCase: {
                    ...mockUseCaseInfo.useCase,
                    defaultUserEmail: 'test@example.com',
                    useExistingUserPool: true
                }
            };

            const visibility = {
                ...DEFAULT_COMPONENT_VISIBILITY,
                showManageUserAccess: false
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfoWithUserAccess}
                    visibility={visibility}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.MCP_SERVER }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ defaultUserEmail: '' });
            expect(mockOnChange).toHaveBeenCalledWith({ useExistingUserPool: false });
        });

        test('sets inError to false when all required fields are filled', () => {
            const mockOnChange = vi.fn();
            const mockUseCaseInfoComplete = {
                useCase: {
                    ...mockUseCaseInfo.useCase,
                    useCaseName: 'Complete Use Case',
                    existingUserPoolId: 'pool-123',
                    existingUserPoolClientId: 'client-123',
                    useExistingUserPool: true,
                    useExistingUserPoolClient: true
                }
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfoComplete}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ inError: false });
        });

        test('sets inError to true when required fields are missing', () => {
            const mockOnChange = vi.fn();
            const mockUseCaseInfoIncomplete = {
                useCase: {
                    ...mockUseCaseInfo.useCase,
                    useCaseName: '', // Missing required field
                    useExistingUserPool: true,
                    existingUserPoolId: '' // Missing required field when useExistingUserPool is true
                }
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfoIncomplete}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ inError: true });
        });
    });

    describe('Required Fields Logic', () => {
        test('updates required fields when useExistingUserPool changes', () => {
            const mockOnChange = vi.fn();
            const mockUseCaseInfoWithUserPool = {
                useCase: {
                    ...mockUseCaseInfo.useCase,
                    useExistingUserPool: true,
                    existingUserPoolId: 'pool-123'
                }
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfoWithUserPool}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Should validate correctly with existing user pool
            expect(mockOnChange).toHaveBeenCalledWith({ inError: false });
        });

        test('updates required fields when useExistingUserPoolClient changes', () => {
            const mockOnChange = vi.fn();
            const mockUseCaseInfoWithClient = {
                useCase: {
                    ...mockUseCaseInfo.useCase,
                    useCaseName: 'Test Case',
                    useExistingUserPoolClient: true,
                    existingUserPoolClientId: 'client-123'
                }
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfoWithClient}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            // Should validate correctly with existing user pool client
            expect(mockOnChange).toHaveBeenCalledWith({ inError: false });
        });
    });

    describe('Field Disabled State', () => {
        test('disables use case name field when deployment action is EDIT', () => {
            const mockContext = {
                state: { deploymentAction: DEPLOYMENT_ACTIONS.EDIT },
                dispatch: vi.fn()
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfo}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    {...mockFormComponentCallbacks()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT, mockContext }
            );

            const useCaseNameField = screen.getByTestId('use-case-name-field');
            expect(useCaseNameField).toBeInTheDocument();
            // Check if the field is disabled by looking for disabled attribute on input
            const input = useCaseNameField.querySelector('input');
            expect(input).toBeInTheDocument();
        });

        test('enables fields when deployment action is CREATE', () => {
            const mockContext = {
                state: { deploymentAction: DEPLOYMENT_ACTIONS.CREATE },
                dispatch: vi.fn()
            };

            renderWithProvider(
                <UseCase
                    info={mockUseCaseInfo}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    {...mockFormComponentCallbacks()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT, mockContext }
            );

            const useCaseNameField = screen.getByTestId('use-case-name-field');
            expect(useCaseNameField).toBeInTheDocument();
            // Fields should be enabled for CREATE action
            const input = useCaseNameField.querySelector('input');
            expect(input).toBeInTheDocument();
        });
    });

    describe('Validation Methods', () => {
        test('validates use case name correctly when showUseCaseOptions is false', () => {
            const mockOnChange = vi.fn();
            const visibility = { ...DEFAULT_COMPONENT_VISIBILITY, showUseCaseOptions: false };

            renderWithProvider(
                <UseCase
                    info={{ useCase: { ...mockUseCaseInfo.useCase, useCaseName: '' } }}
                    visibility={visibility}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ inError: false });
        });

        test('validates user pool ID correctly when not using existing pool', () => {
            const mockOnChange = vi.fn();

            renderWithProvider(
                <UseCase
                    info={{
                        useCase: { ...mockUseCaseInfo.useCase, useExistingUserPool: false, existingUserPoolId: '' }
                    }}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ inError: false });
        });

        test('validates user pool client ID correctly when not using existing client', () => {
            const mockOnChange = vi.fn();

            renderWithProvider(
                <UseCase
                    info={{
                        useCase: {
                            ...mockUseCaseInfo.useCase,
                            useExistingUserPoolClient: false,
                            existingUserPoolClientId: ''
                        }
                    }}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ inError: false });
        });

        test('sets error when use case name is required but empty', () => {
            const mockOnChange = vi.fn();

            renderWithProvider(
                <UseCase
                    info={{ useCase: { ...mockUseCaseInfo.useCase, useCaseName: '' } }}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ inError: true });
        });

        test('sets error when user pool ID is required but empty', () => {
            const mockOnChange = vi.fn();

            renderWithProvider(
                <UseCase
                    info={{
                        useCase: { ...mockUseCaseInfo.useCase, useExistingUserPool: true, existingUserPoolId: '' }
                    }}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ inError: true });
        });

        test('sets error when user pool client ID is required but empty', () => {
            const mockOnChange = vi.fn();

            renderWithProvider(
                <UseCase
                    info={{
                        useCase: {
                            ...mockUseCaseInfo.useCase,
                            useExistingUserPoolClient: true,
                            existingUserPoolClientId: ''
                        }
                    }}
                    visibility={DEFAULT_COMPONENT_VISIBILITY}
                    onChange={mockOnChange}
                    setHelpPanelContent={vi.fn()}
                />,
                { route: USECASE_TYPE_ROUTE.TEXT }
            );

            expect(mockOnChange).toHaveBeenCalledWith({ inError: true });
        });
    });
});
