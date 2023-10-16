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

import { useState, useCallback, useRef, useContext } from 'react';
import { AppLayout, HelpPanel, Wizard, Box, Alert, SpaceBetween } from '@cloudscape-design/components';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from './wizard-components.jsx';
import { appLayoutAriaLabels } from '../../i18n-strings';
import UseCase from './stepComponents/step1.jsx';
import KnowledgeBase from './stepComponents/step3.jsx';
import Model from './stepComponents/step2.jsx';
import Review from './stepComponents/step4.jsx';
import { DEFAULT_STEP_INFO, MODEL_FAMILY_PROVIDER_OPTIONS, HF_INF_ENDPOINT_OPTION_IDX } from './steps-config.jsx';
import { TOOLS_CONTENT } from './tools-content.jsx';
import { ExternalLinkGroup, InfoLink, Notifications, Navigation } from '../commons';
import { API } from 'aws-amplify';
import {
    API_NAME,
    BEDROCK_MODEL_PROVIDER_NAME,
    DEPLOYMENT_ACTIONS,
    DEPLOYMENT_PLATFORM_API_ROUTES,
    DEPLOYMENT_STATUS_NOTIFICATION
} from '../../utils/constants';
import { generateToken } from '../../utils/utils';
import { createDeployRequestPayload } from './utils.js';
import HomeContext from '../../home/home.context';
import { ConfirmDeployModal } from '../commons/deploy-confirmation-modal.jsx';

const steps = [
    {
        title: 'Select use case',
        stateKey: 'useCase',
        StepContent: UseCase
    },
    {
        title: 'Select model',
        stateKey: 'model',
        StepContent: Model
    },
    {
        title: 'Select knowledge base',
        stateKey: 'knowledgeBase',
        StepContent: KnowledgeBase
    },
    {
        title: 'Review and create',
        stateKey: 'review',
        StepContent: Review
    }
];

const getDefaultToolsContent = (activeIndex) => TOOLS_CONTENT[steps[activeIndex].stateKey].default;

const getFormattedToolsContent = (tools) => (
    <HelpPanel header={<h2>{tools.title}</h2>} footer={<ExternalLinkGroup items={tools.links} />}>
        {tools.content}
    </HelpPanel>
);

const useTools = () => {
    const [toolsContent, setToolsContent] = useState(getFormattedToolsContent(getDefaultToolsContent(0)));
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const appLayoutRef = useRef();

    const setFormattedToolsContent = (tools) => {
        setToolsContent(getFormattedToolsContent(tools));
    };

    const setHelpPanelContent = (tools) => {
        if (tools) {
            setFormattedToolsContent(tools);
        }
        setIsToolsOpen(true);
        appLayoutRef.current?.focusToolsClose();
    };
    const closeTools = () => setIsToolsOpen(false);

    const onToolsChange = (evt) => setIsToolsOpen(evt.detail.open);

    return {
        toolsContent,
        isToolsOpen,
        setHelpPanelContent,
        closeTools,
        setFormattedToolsContent,
        onToolsChange,
        appLayoutRef
    };
};

const formatModelParamsForAttributeEditor = (modelParams) => {
    if (Object.keys(modelParams).length === 0) {
        return [];
    }

    const formattedItems = [];
    for (const [paramKey, paramValueWithType] of Object.entries(modelParams)) {
        formattedItems.push({
            key: paramKey,
            value: paramValueWithType.Value,
            type: {
                label: paramValueWithType.Type,
                value: paramValueWithType.Type
            }
        });
    }

    return formattedItems;
};

const getWizardStepsInfo = (selectedDeployment, deploymentAction) => {
    let wizardStepsInfo = DEFAULT_STEP_INFO;
    if (deploymentAction === DEPLOYMENT_ACTIONS.EDIT || deploymentAction === DEPLOYMENT_ACTIONS.CLONE) {
        const modelProvider = selectedDeployment.LlmParams.InferenceEndpoint
            ? MODEL_FAMILY_PROVIDER_OPTIONS.find((item) => item.label === 'HuggingFace - Inference Endpoint')
            : MODEL_FAMILY_PROVIDER_OPTIONS.find((item) => item.label === selectedDeployment.LlmParams.ModelProvider);
        wizardStepsInfo = {
            useCase: {
                useCase: DEFAULT_STEP_INFO.useCase.useCase,
                useCaseName: selectedDeployment.Name,
                defaultUserEmail:
                    selectedDeployment.defaultUserEmail !== 'placeholder@example.com'
                        ? selectedDeployment.defaultUserEmail
                        : '',
                useCaseDescription: selectedDeployment.Description,
                inError: false
            },
            knowledgeBase: {
                isRagRequired: selectedDeployment.LlmParams.RAGEnabled,
                knowledgeBaseType: DEFAULT_STEP_INFO.knowledgeBase.knowledgeBaseType,
                existingKendraIndex: 'yes',
                kendraIndexId: selectedDeployment.kendraIndexId ?? '',
                kendraAdditionalQueryCapacity: DEFAULT_STEP_INFO.knowledgeBase.kendraAdditionalQueryCapacity,
                kendraAdditionalStorageCapacity: DEFAULT_STEP_INFO.knowledgeBase.kendraAdditionalStorageCapacity,
                kendraEdition:
                    selectedDeployment.newKendraIndexEdition ?? DEFAULT_STEP_INFO.knowledgeBase.kendraEdition,
                maxNumDocs:
                    selectedDeployment.KnowledgeBaseParams.NumberOfDocs?.toString() ??
                    DEFAULT_STEP_INFO.knowledgeBase.maxNumDocs,
                inError: false,
                kendraIndexName:
                    selectedDeployment.newKendraIndexName ?? DEFAULT_STEP_INFO.knowledgeBase.kendraIndexName
            },
            model: {
                modelProvider: modelProvider,
                apiKey: DEFAULT_STEP_INFO.model.apiKey,
                modelName: selectedDeployment.LlmParams.ModelId,
                promptTemplate: selectedDeployment.LlmParams.PromptTemplate,
                modelParameters: formatModelParamsForAttributeEditor(selectedDeployment.LlmParams.ModelParams),
                inError: false,
                temperature: parseFloat(selectedDeployment.LlmParams.Temperature),
                verbose: selectedDeployment.LlmParams.Verbose,
                streaming: selectedDeployment.LlmParams.Streaming
            }
        };
    }

    if (selectedDeployment.LlmParams && selectedDeployment.LlmParams.InferenceEndpoint) {
        wizardStepsInfo.model.modelProvider = MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX];
    }

    if (deploymentAction === DEPLOYMENT_ACTIONS.CLONE) {
        wizardStepsInfo.useCase.useCaseName += '-clone';
    }
    return wizardStepsInfo;
};

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
                const requestPayload = createDeployRequestPayload(stepsInfo);
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
    } = useTools();
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

    const wizardSteps = steps.map(({ title, stateKey, StepContent }) => ({
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
        )
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
        return stepsInfo.model.modelProvider.value !== BEDROCK_MODEL_PROVIDER_NAME;
    };

    return (
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
    );
};

export default WizardView;
