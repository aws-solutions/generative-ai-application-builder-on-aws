// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { generateToolsForStep } from '@/hooks/useTools';
import { useState, useCallback, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import HomeContext from '@/contexts/home.context';
import {
    API_NAME,
    DELAY_AFTER_SUCCESS_DEPLOYMENT,
    DEPLOYMENT_ACTIONS,
    DEPLOYMENT_PLATFORM_API_ROUTES,
    DEPLOYMENT_STATUS_NOTIFICATION
} from '@/utils/constants';
import { createDeployRequestPayload, createUpdateRequestPayload } from './utils';
import { generateToken } from '@/utils/utils';
import { API } from 'aws-amplify';
import { InfoLink, Notifications, Navigation } from '../commons';
import { MCPSchemaUploadHandler } from './utils/mcpSchemaUpload';
import {
    AppLayout,
    Wizard,
    Box,
    Alert,
    SpaceBetween,
    WizardProps,
    StatusIndicator
} from '@cloudscape-design/components';
import { Breadcrumbs } from './wizard-components';
import { ConfirmDeployModal } from '../commons/deploy-confirmation-modal';
import { appLayoutAriaLabels } from '@/i18n-strings';
import { useQueryClient } from '@tanstack/react-query';
import { useUseCaseDetailsQuery } from '@/hooks/useQueries';
import { UseCaseType } from './interfaces/UseCaseTypes/UseCaseType';
import { ToolHelpPanelContent } from './interfaces/Steps';
import { BaseWizardProps } from './interfaces/Steps/BaseWizardStep';
import { ErrorBoundary } from '../commons/ErrorBoundary';

const getWizardStepsInfo = (
    useCase: UseCaseType,
    selectedDeployment: any,
    deploymentAction: string
): Record<string, BaseWizardProps> => {
    let wizardStepsInfo: Record<string, BaseWizardProps> = {};
    if (deploymentAction === DEPLOYMENT_ACTIONS.EDIT || deploymentAction === DEPLOYMENT_ACTIONS.CLONE) {
        for (const step of useCase.steps) {
            step.mapStepInfoFromDeployment(selectedDeployment, deploymentAction);
            wizardStepsInfo[step.id] = step.props;
        }
    } else {
        for (const step of useCase.steps) {
            wizardStepsInfo[step.id] = step.props;
        }
    }

    return wizardStepsInfo;
};

export const useWizard = (
    useCase: UseCaseType,
    closeTools: { (): void; (): void },
    setFormattedToolsContent: { (tools: ToolHelpPanelContent): void }
) => {
    const {
        state: { selectedDeployment, deploymentAction, runtimeConfig, selectedTenantId }
    } = useContext(HomeContext);

    const shouldFetchDeploymentInfo =
        deploymentAction === DEPLOYMENT_ACTIONS.EDIT || deploymentAction === DEPLOYMENT_ACTIONS.CLONE;

    const { data: deploymentInfo, isLoading: isLoadingDeploymentInfo } = useUseCaseDetailsQuery(
        selectedDeployment.UseCaseId,
        selectedDeployment.UseCaseType,
        {
            refetchOnWindowFocus: false,
            enabled: shouldFetchDeploymentInfo
        }
    );

    type AllowedMethod = 'post' | 'patch';
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [useCaseDeployStatus, setUseCaseDeployStatus] = useState('');
    const [schemaUploadErrorMessage, setSchemaUploadErrorMessage] = useState('');
    const [schemaFileCount, setSchemaFileCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [stepsInfo, setStepsInfo] = useState<Record<string, BaseWizardProps>>({});

    // MCP schema file upload handler
    MCPSchemaUploadHandler.initializeNotifications(null);

    useEffect(() => {
        if (!shouldFetchDeploymentInfo) {
            const init = async () => {
                try {
                    const wizardStepsInfo = getWizardStepsInfo(useCase, selectedDeployment, deploymentAction);
                    setStepsInfo(wizardStepsInfo);
                } catch (error) {
                    console.log(error);
                } finally {
                    setIsLoading(false);
                }
            };
            init();
            return;
        }

        if (!isLoadingDeploymentInfo && deploymentInfo) {
            const init = async () => {
                try {
                    const wizardStepsInfo = getWizardStepsInfo(useCase, deploymentInfo, deploymentAction);
                    setStepsInfo(wizardStepsInfo);
                } catch (error) {
                    console.log(error);
                } finally {
                    setIsLoading(false);
                }
            };
            init();
        }
    }, [
        deploymentInfo,
        isLoadingDeploymentInfo,
        deploymentAction,
        useCase,
        selectedDeployment,
        shouldFetchDeploymentInfo
    ]);

    const onStepInfoChange = useCallback(
        (stateKey: string, newStepState: Partial<BaseWizardProps>) => {
            setStepsInfo({
                ...stepsInfo,
                [stateKey]: {
                    ...stepsInfo[stateKey],
                    ...newStepState
                }
            });
        },
        [stepsInfo]
    );

    const setActiveStepIndexAndCloseTools = (index: number) => {
        if (useCaseDeployStatus === DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE) {
            setUseCaseDeployStatus('');
            setSchemaUploadErrorMessage('');
            setSchemaFileCount(0);
        }
        setActiveStepIndex(index);
        setFormattedToolsContent(useCase.steps[index].toolContent);
        closeTools();
    };

    const onNavigate = (detail: WizardProps.NavigateDetail) => {
        if (useCaseDeployStatus === DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE) {
            setUseCaseDeployStatus('');
            setSchemaUploadErrorMessage('');
            setSchemaFileCount(0);
        }

        if (
            detail.reason === 'next' &&
            useCase.steps[activeStepIndex].id !== 'review' &&
            stepsInfo[useCase.steps[activeStepIndex].id].inError
        ) {
            setShowErrorAlert(true);
        } else {
            setActiveStepIndexAndCloseTools(detail.requestedStepIndex);
            setShowErrorAlert(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    };

    const onSubmit = async () => {
        let endpoint;
        let requestPayload;
        let method;
        try {
            if (MCPSchemaUploadHandler.requiresSchemaUpload(useCase.type)) {
                const fileCount = MCPSchemaUploadHandler.getFileCount(stepsInfo);
                setSchemaFileCount(fileCount);
                await MCPSchemaUploadHandler.uploadAllSchemaFiles(stepsInfo, setUseCaseDeployStatus);
            }
            setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.PENDING);

            if (deploymentAction === DEPLOYMENT_ACTIONS.EDIT) {
                endpoint = DEPLOYMENT_PLATFORM_API_ROUTES.UPDATE_USE_CASE.route(
                    useCase.type,
                    selectedDeployment.UseCaseId
                );
                method = DEPLOYMENT_PLATFORM_API_ROUTES.UPDATE_USE_CASE.method;
                requestPayload = createUpdateRequestPayload(stepsInfo, runtimeConfig);
            } else {
                endpoint = DEPLOYMENT_PLATFORM_API_ROUTES.CREATE_USE_CASE.route(useCase.type);
                method = DEPLOYMENT_PLATFORM_API_ROUTES.CREATE_USE_CASE.method;
                requestPayload = createDeployRequestPayload(stepsInfo, runtimeConfig, selectedTenantId);
            }
            await createUseCaseRequest(endpoint, requestPayload, method);
        } catch (error) {
            scrollToTop();
            console.error(error);
            const errorUpdatedState = (error as any).updatedStepsInfo;
            if (errorUpdatedState) {
                setStepsInfo(errorUpdatedState);
            }

            const errorMessage = (error as Error).message;
            const isSchemaUploadError = errorMessage.includes('schema file upload failed');

            if (isSchemaUploadError) {
                setSchemaUploadErrorMessage(errorMessage);
            } else {
                setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.FAILURE);
            }
        }
    };

    // Type checking API methods in this file
    const isAllowedMethod = (method: string): method is AllowedMethod => method === 'post' || method === 'patch';

    /**
     * Make a request to deploy or update a use case using CloudFormation
     * POST /deployments/*
     * PATCH /deployments/{useCaseId}
     * PATCH /deployments/mcp/{useCaseId}
     * PATCH /deployments/agent/{useCaseId}
     *
     * @param {string} endpoint API Endpoint to call
     * @param {Object} params Use case deployment params to send to the API
     */
    const createUseCaseRequest = async (
        endpoint: string,
        params: Record<string, any> = {},
        apiMethod: string 
    ) => {
        console.log(JSON.stringify(params, null, 2));
        setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.PENDING);
        const token = await generateToken();

        const key = apiMethod.toLowerCase();

        if (!isAllowedMethod(key)) {
            throw new Error(`Unsupported method: ${apiMethod}`);
        }

        // This does call API.post or API.patch depending on the apiMethod argument
        const response = await API[key](API_NAME, endpoint, {
            body: params,
            headers: { Authorization: token }
        });

        setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS);
        return response;
    };

    return {
        activeStepIndex,
        stepsInfo,
        showErrorAlert,
        useCaseDeployStatus,
        schemaUploadErrorMessage,
        schemaFileCount,
        setActiveStepIndexAndCloseTools,
        onStepInfoChange,
        onNavigate,
        onSubmit,
        isLoading: isLoading || isLoadingDeploymentInfo
    };
};

export interface WizardViewProps {
    useCase: UseCaseType;
}
const WizardView = (props: WizardViewProps) => {
    const useCase = props.useCase;
    const infoPanel = generateToolsForStep(useCase.steps[0]);

    const queryClient = useQueryClient();

    const {
        activeStepIndex,
        stepsInfo,
        showErrorAlert,
        useCaseDeployStatus,
        schemaUploadErrorMessage,
        schemaFileCount,
        setActiveStepIndexAndCloseTools,
        onStepInfoChange,
        onNavigate,
        onSubmit,
        isLoading
    } = useWizard(useCase, infoPanel.close, infoPanel.setContent);

    useEffect(() => {
        if (useCaseDeployStatus === DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS) {
            setTimeout(() => {
                homeDispatch({
                    field: 'reloadData',
                    value: true
                });
                navigate('/');
            }, DELAY_AFTER_SUCCESS_DEPLOYMENT);
        }
    }, [useCaseDeployStatus]);

    const {
        state: { deploymentAction },
        dispatch: homeDispatch
    } = useContext(HomeContext);
    const navigate = useNavigate();

    const [showConfirmDeployModal, setShowConfirmDeployModal] = useState(false);

    const onConfirmDeployInit = () => setShowConfirmDeployModal(true);
    const onConfirmDeployDiscard = () => setShowConfirmDeployModal(false);

    const [isWizardNextStepLoading, setIsWizardNextStepLoading] = useState(false);

    if (isLoading) {
        return (
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                <StatusIndicator type="loading">Loading deployment details...</StatusIndicator>
            </div>
        );
    }

    const wizardSteps = useCase.steps.map((step) => ({
        title: step.title,
        info: (
            <InfoLink
                onFollow={() => infoPanel.setContentAndOpen(step.toolContent)}
                ariaLabel={`Information about ${step.title}.`}
            />
        ),
        content: step.contentGenerator({
            info: stepsInfo,
            onChange: (newStepState) => {
                onStepInfoChange(step.id, newStepState);
            },
            setHelpPanelContent: infoPanel.setContentAndOpen,
            setActiveStepIndex: setActiveStepIndexAndCloseTools,
            handleWizardNextStepLoading: setIsWizardNextStepLoading,
            visibility: step.visibility
        }),
        isOptional:
            deploymentAction === DEPLOYMENT_ACTIONS.EDIT ||
            deploymentAction === DEPLOYMENT_ACTIONS.CLONE ||
            step.isOptional
    }));
    const i18nStrings = {
        stepNumberLabel: (stepNumber: number) => `Step ${stepNumber}`,
        collapsedStepsLabel: (stepNumber: number, stepsCount: number) => `Step ${stepNumber} of ${stepsCount}`,
        errorIconAriaLabel: 'Error',
        navigationAriaLabel: 'Steps',
        cancelButton: 'Cancel',
        previousButton: 'Previous',
        nextButton: 'Next',
        submitButton: deploymentAction === DEPLOYMENT_ACTIONS.EDIT ? 'Update use case' : 'Deploy use case',
        optional: 'optional'
    };

    const onCancel = () => {
        queryClient.invalidateQueries();
        navigate('/');
    };

    const onSuccessAction = () => {
        homeDispatch({
            field: 'reloadData',
            value: true
        });

        navigate('/');
    };

    return (
        <AppLayout
            ref={infoPanel.appLayoutRef}
            navigation={<Navigation />}
            tools={infoPanel.content}
            toolsOpen={infoPanel.isOpen}
            onToolsChange={({ detail }) => infoPanel.onChange(detail)}
            breadcrumbs={<Breadcrumbs />}
            contentType="wizard"
            data-testid="wizard-view"
            content={
                <Box>
                    <SpaceBetween size="m">
                        <>
                            <ErrorBoundary componentName="Wizard">
                                <SpaceBetween size="m">
                                    <Wizard
                                        steps={wizardSteps}
                                        activeStepIndex={activeStepIndex}
                                        i18nStrings={i18nStrings}
                                        onNavigate={({ detail }) => onNavigate(detail)}
                                        onCancel={onCancel}
                                        onSubmit={onConfirmDeployInit}
                                        isLoadingNextStep={isWizardNextStepLoading}
                                        data-testid="wizard-component"
                                    />
                                    {showErrorAlert && (
                                        <Alert
                                            statusIconAriaLabel="Error"
                                            type="error"
                                            header="Please fill out any missing required fields and address any errors shown"
                                            data-testid="wizard-error-alert"
                                        ></Alert>
                                    )}
                                </SpaceBetween>
                            </ErrorBoundary>
                            <ConfirmDeployModal
                                visible={showConfirmDeployModal}
                                onDiscard={onConfirmDeployDiscard}
                                onConfirm={onSubmit}
                                deploymentAction={deploymentAction}
                                isThirdPartyProvider={false}
                                modelData={stepsInfo.model}
                            />
                        </>
                    </SpaceBetween>
                </Box>
            }
            ariaLabels={appLayoutAriaLabels}
            notifications={
                <Notifications
                    status={useCaseDeployStatus}
                    onSuccessButtonAction={onSuccessAction}
                    schemaUploadErrorMessage={schemaUploadErrorMessage}
                    fileCount={schemaFileCount}
                />
            }
        />
    );
};

export default WizardView;
