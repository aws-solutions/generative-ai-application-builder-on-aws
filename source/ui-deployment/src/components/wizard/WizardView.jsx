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

import { useTools } from '@/hooks/useTools';
import { useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import HomeContext from '@/contexts/home.context';
import {
    API_NAME,
    BEDROCK_MODEL_PROVIDER_NAME,
    DEPLOYMENT_ACTIONS,
    DEPLOYMENT_PLATFORM_API_ROUTES,
    DEPLOYMENT_STATUS_NOTIFICATION,
    SAGEMAKER_MODEL_PROVIDER_NAME
} from '@/utils/constants';
import {
    createDeployRequestPayload,
    createUpdateRequestPayload,
    generateKnowledgeBaseStepInfoFromDeployment,
    mapModelStepInfoFromDeployment,
    mapPromptStepInfoFromDeployment,
    mapUseCaseStepInfoFromDeployment,
    parseVpcInfoFromSelectedDeployment
} from './utils';
import { generateToken } from '@/utils/utils';
import { API } from 'aws-amplify';
import { DEFAULT_STEP_INFO, MODEL_FAMILY_PROVIDER_OPTIONS } from './steps-config';
import { InfoLink, Notifications, Navigation } from '../commons';
import { AppLayout, Wizard, Box, Alert, SpaceBetween } from '@cloudscape-design/components';
import { Breadcrumbs } from './wizard-components';
import { ConfirmDeployModal } from '../commons/deploy-confirmation-modal';
import { appLayoutAriaLabels } from '@/i18n-strings';
import { TOOLS_CONTENT } from './tools-content';

import UseCase from './UseCase';
import Vpc from './VpcConfig';
import Model from './Model';
import KnowledgeBase from './KnowledgeBase';
import Prompt from './Prompt';
import Review from './Review';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const steps = [
    {
        title: 'Select use case',
        stateKey: 'useCase',
        StepContent: UseCase,
        isOptional: false
    },
    {
        title: 'Select network configuration',
        stateKey: 'vpc',
        StepContent: Vpc,
        isOptional: true
    },
    {
        title: 'Select model',
        stateKey: 'model',
        StepContent: Model,
        isOptional: false
    },
    {
        title: 'Select knowledge base',
        stateKey: 'knowledgeBase',
        StepContent: KnowledgeBase,
        isOptional: true
    },
    {
        title: 'Select prompt',
        stateKey: 'prompt',
        StepContent: Prompt,
        isOptional: false
    },
    {
        title: 'Review and create',
        stateKey: 'review',
        StepContent: Review,
        isOptional: false
    }
];

const getWizardStepsInfo = (selectedDeployment, deploymentAction) => {
    let wizardStepsInfo = DEFAULT_STEP_INFO;
    if (deploymentAction === DEPLOYMENT_ACTIONS.EDIT || deploymentAction === DEPLOYMENT_ACTIONS.CLONE) {
        const modelProvider = MODEL_FAMILY_PROVIDER_OPTIONS.find(
            (item) => item.value === selectedDeployment.LlmParams.ModelProvider
        );
        wizardStepsInfo = {
            useCase: mapUseCaseStepInfoFromDeployment(selectedDeployment),
            vpc: parseVpcInfoFromSelectedDeployment(selectedDeployment),
            knowledgeBase: generateKnowledgeBaseStepInfoFromDeployment(selectedDeployment),
            model: mapModelStepInfoFromDeployment(selectedDeployment, modelProvider),
            prompt: mapPromptStepInfoFromDeployment(selectedDeployment)
        };
    }

    if (deploymentAction === DEPLOYMENT_ACTIONS.CLONE) {
        wizardStepsInfo.useCase.useCaseName += '-clone';
    }
    return wizardStepsInfo;
};

const getDefaultToolsContent = (activeIndex) => TOOLS_CONTENT[steps[activeIndex].stateKey].default;

export const useWizard = (closeTools, setFormattedToolsContent) => {
    const {
        state: { selectedDeployment, deploymentAction }
    } = useContext(HomeContext);

    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [useCaseDeployStatus, setUseCaseDeployStatus] = useState('');

    let wizardStepsInfo = getWizardStepsInfo(selectedDeployment, deploymentAction);
    const [stepsInfo, setStepsInfo] = useState(wizardStepsInfo);

    const onStepInfoChange = useCallback(
        (stateKey, newStepState) => {
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

    const setActiveStepIndexAndCloseTools = (index) => {
        setActiveStepIndex(index);
        setFormattedToolsContent(getDefaultToolsContent(index));
        closeTools();
    };

    const onNavigate = (evt) => {
        if (
            evt.detail.reason === 'next' &&
            steps[activeStepIndex].stateKey !== 'review' &&
            stepsInfo[steps[activeStepIndex].stateKey].inError
        ) {
            setShowErrorAlert(true);
        } else {
            setActiveStepIndexAndCloseTools(evt.detail.requestedStepIndex);
            setShowErrorAlert(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    };

    const onSubmit = async () => {
        try {
            if (deploymentAction === DEPLOYMENT_ACTIONS.EDIT) {
                const endpoint = DEPLOYMENT_PLATFORM_API_ROUTES.UPDATE_USE_CASE.route(selectedDeployment.UseCaseId);
                const requestPayload = createUpdateRequestPayload(stepsInfo);
                scrollToTop();
                await updateUseCasePatchRequest(endpoint, requestPayload);
            } else {
                const endpoint = DEPLOYMENT_PLATFORM_API_ROUTES.CREATE_USE_CASE.route;
                const requestPayload = createDeployRequestPayload(stepsInfo);
                scrollToTop();
                await deployUseCasePostRequest(endpoint, requestPayload);
            }
        } catch (error) {
            scrollToTop();
            setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.FAILURE);
            console.error(error);
        }
    };

    const updateUseCasePatchRequest = async (endpoint, params = {}) => {
        setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.PENDING);
        const token = await generateToken();
        const response = await API.patch(API_NAME, endpoint, {
            body: params,
            headers: {
                Authorization: token
            }
        });
        setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS);
        return response;
    };

    /**
     * Make a reqeust to deploy a use case using CloudFormation
     * POST /deployments/
     *
     * @param {string} endpoint API Endpoint to call
     * @param {Object} params Use case deployment params to send to the API
     */
    const deployUseCasePostRequest = async (endpoint, params = {}) => {
        setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.PENDING);
        const token = await generateToken();
        const response = await API.post(API_NAME, endpoint, {
            body: params,
            headers: {
                Authorization: token
            }
        });
        setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS);
        return response;
    };

    return {
        activeStepIndex,
        stepsInfo,
        showErrorAlert,
        useCaseDeployStatus,
        setActiveStepIndexAndCloseTools,
        onStepInfoChange,
        onNavigate,
        onSubmit
    };
};

const WizardView = () => {
    const {
        toolsContent,
        isToolsOpen,
        setHelpPanelContent,
        closeTools,
        setFormattedToolsContent,
        onToolsChange,
        appLayoutRef
    } = useTools(steps[0].stateKey);

    const {
        activeStepIndex,
        stepsInfo,
        showErrorAlert,
        useCaseDeployStatus,
        setActiveStepIndexAndCloseTools,
        onStepInfoChange,
        onNavigate,
        onSubmit
    } = useWizard(closeTools, setFormattedToolsContent);

    const {
        state: { deploymentAction },
        dispatch: homeDispatch
    } = useContext(HomeContext);
    const navigate = useNavigate();

    const [showConfirmDeployModal, setShowConfirmDeployModal] = useState(false);

    const onConfirmDeployInit = () => setShowConfirmDeployModal(true);
    const onConfirmDeployDiscard = () => setShowConfirmDeployModal(false);

    const wizardSteps = steps.map(({ title, stateKey, StepContent, isOptional }) => ({
        title,
        info: (
            <InfoLink
                onFollow={() => setHelpPanelContent(TOOLS_CONTENT[stateKey].default)}
                ariaLabel={`Information about ${title}.`}
            />
        ),
        content: (
            <StepContent
                info={stepsInfo}
                onChange={(newStepState) => {
                    onStepInfoChange(stateKey, newStepState);
                }}
                setHelpPanelContent={setHelpPanelContent}
                setActiveStepIndex={setActiveStepIndexAndCloseTools}
            />
        ),
        isOptional
    }));

    const i18nStrings = {
        stepNumberLabel: (stepNumber) => `Step ${stepNumber}`,
        collapsedStepsLabel: (stepNumber, stepsCount) => `Step ${stepNumber} of ${stepsCount}`,
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

    const isThirdPartyProvider = () => {
        return !(
            stepsInfo.model.modelProvider.value === BEDROCK_MODEL_PROVIDER_NAME ||
            stepsInfo.model.modelProvider.value === SAGEMAKER_MODEL_PROVIDER_NAME
        );
    };

    return (
        <QueryClientProvider client={queryClient}>
            <AppLayout
                ref={appLayoutRef}
                navigation={<Navigation />}
                tools={toolsContent}
                toolsOpen={isToolsOpen}
                onToolsChange={onToolsChange}
                breadcrumbs={<Breadcrumbs />}
                contentType="wizard"
                data-testid="wizard-view"
                content={
                    <Box>
                        <SpaceBetween size="m">
                            <Wizard
                                steps={wizardSteps}
                                activeStepIndex={activeStepIndex}
                                i18nStrings={i18nStrings}
                                onNavigate={onNavigate}
                                onCancel={onCancel}
                                onSubmit={onConfirmDeployInit}
                            />
                            {showErrorAlert && (
                                <Alert
                                    statusIconAriaLabel="Error"
                                    type="error"
                                    header="Please fill out any missing required fields and address any errors shown"
                                ></Alert>
                            )}
                            <ConfirmDeployModal
                                visible={showConfirmDeployModal}
                                onDiscard={onConfirmDeployDiscard}
                                onConfirm={onSubmit}
                                deploymentAction={deploymentAction}
                                isThirdPartyProvider={isThirdPartyProvider()}
                            />
                        </SpaceBetween>
                    </Box>
                }
                ariaLabels={appLayoutAriaLabels}
                notifications={<Notifications status={useCaseDeployStatus} onSuccessButtonAction={onSuccessAction} />}
            />
        </QueryClientProvider>
    );
};

export default WizardView;
