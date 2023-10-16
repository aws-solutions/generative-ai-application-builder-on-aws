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

import { useState, useContext } from 'react';
import {
    Box,
    BreadcrumbGroup,
    ColumnLayout,
    Container,
    Header,
    Link,
    StatusIndicator,
    SpaceBetween
} from '@cloudscape-design/components';
import { useNavigate } from 'react-router-dom';
import HomeContext from '../../home/home.context';
import { DEFAULT_STEP_INFO, MODEL_FAMILY_PROVIDER_OPTIONS, HF_INF_ENDPOINT_OPTION_IDX } from '../wizard/steps-config';
import { createCfnLink, parseStackName } from '../commons/table-config';
import { ExternalLinkWarningModal } from '../commons/external-link-warning-modal';
import { statusIndicatorTypeSelector } from '../dashboard/deployments';
import { useComponentId } from '../commons/use-component-id';
import { BEDROCK_MODEL_PROVIDER_NAME } from '../../utils/constants';

const resourcesBreadcrumbs = [
    {
        text: 'Deployments',
        href: '/'
    }
];

export const ValueWithLabel = ({ label, children }) => (
    <div>
        <Box variant="awsui-key-label">{label}</Box>
        <div>{children}</div>
    </div>
);

export const Breadcrumbs = ({ deploymentId }) => {
    const navigate = useNavigate();

    return (
        <BreadcrumbGroup
            items={[
                ...resourcesBreadcrumbs,
                {
                    text: deploymentId.split('/')[0],
                    href: '#'
                }
            ]}
            expandAriaLabel="Show path"
            ariaLabel="Breadcrumbs"
            onFollow={(event) => {
                event.preventDefault();
                navigate(event.detail.href);
            }}
        />
    );
};

export const PageHeader = ({ buttonsList, deploymentId }) => {
    return (
        <Header
            variant="h1"
            actions={
                <SpaceBetween direction="horizontal" size="xs">
                    {buttonsList.length > 0 && buttonsList.map((button) => button)}
                </SpaceBetween>
            }
        >
            {deploymentId.split('/')[0]}
        </Header>
    );
};

export const dateOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
};

// function to create a direct link to the kendra console given a kendra index id
export const createKendraConsoleLink = (region, kendraIndexId) => {
    return `https://console.aws.amazon.com/kendra/home?region=${region}#/indexes/${kendraIndexId}/details`;
};

export const GeneralConfig = () => {
    const {
        state: { selectedDeployment }
    } = useContext(HomeContext);

    const [showCloudwatchModal, setShowCloudwatchModal] = useState(false);
    const [showCfnModal, setShowCfnModal] = useState(false);

    const isEmptyOrUndefined = (value) => {
        return value === undefined || value === '' || value === null;
    };

    return (
        <Container header={<Header variant="h2">Deployment details</Header>} data-testid="deployment-details-container">
            <ColumnLayout columns={4} variant="text-grid">
                <ValueWithLabel label={'Type'}>{DEFAULT_STEP_INFO.useCase.useCase.label}</ValueWithLabel>
                <ValueWithLabel label={'Name'}>{selectedDeployment.Name}</ValueWithLabel>

                {!isEmptyOrUndefined(selectedDeployment.Description) && (
                    <ValueWithLabel label={'Description'}>{selectedDeployment.Description}</ValueWithLabel>
                )}
                {selectedDeployment.CreatedDate && (
                    <ValueWithLabel label={'Creation Date'}>
                        {new Date(selectedDeployment.CreatedDate).toLocaleString('en-us', dateOptions)}
                    </ValueWithLabel>
                )}
                {selectedDeployment.UseCaseId && (
                    <ValueWithLabel label={'Application ID'}>{selectedDeployment.UseCaseId}</ValueWithLabel>
                )}

                <ValueWithLabel label={'Status'}>
                    <StatusIndicator type={statusIndicatorTypeSelector(selectedDeployment.status)}>
                        {selectedDeployment.status}
                    </StatusIndicator>
                </ValueWithLabel>

                {selectedDeployment.cloudFrontWebUrl && (
                    <ValueWithLabel label={'Application CloudFront URL'}>
                        <Link
                            external
                            href={selectedDeployment.cloudFrontWebUrl}
                            target="_blank"
                            data-testid="application-link"
                        >
                            <strong>{selectedDeployment.cloudFrontWebUrl}</strong>
                        </Link>
                    </ValueWithLabel>
                )}

                {selectedDeployment.cloudwatchDashboardUrl && (
                    <ValueWithLabel label={'CloudWatch Dashboard'}>
                        <Link
                            target="_blank"
                            onFollow={() => {
                                setShowCloudwatchModal(true);
                            }}
                            external
                        >
                            {selectedDeployment.cloudwatchDashboardUrl.split('/').pop()}
                        </Link>
                        <ExternalLinkWarningModal
                            visible={showCloudwatchModal}
                            onDiscard={() => setShowCloudwatchModal(false)}
                            externalLink={selectedDeployment.cloudwatchDashboardUrl}
                            resourceType="CloudWatch Dashboard"
                        />
                    </ValueWithLabel>
                )}

                {selectedDeployment.StackId && (
                    <Box data-testid="cfn-link-with-modal">
                        <Box variant="awsui-key-label">CloudFormation Stack</Box>
                        <Link
                            target="_blank"
                            onFollow={() => {
                                setShowCfnModal(true);
                            }}
                            external
                        >
                            {parseStackName(selectedDeployment.StackId)}
                        </Link>
                        <ExternalLinkWarningModal
                            visible={showCfnModal}
                            onDiscard={() => setShowCfnModal(false)}
                            externalLink={createCfnLink(selectedDeployment.StackId)}
                            resourceType="CloudFormation Stack"
                        />
                    </Box>
                )}
            </ColumnLayout>
        </Container>
    );
};

const getBedrockModelFamily = (modelName) => {
    try {
        return modelName.split('.')[0];
    } catch (error) {
        return undefined;
    }
};

const cleanProviderName = (modelProvider) => {
    return modelProvider === MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX].value
        ? modelProvider.split('-')[0]
        : modelProvider;
};

export const getSystemPromptFromRuntimeConfig = (runtimeConfig, modelProvider, isRagEnabled, modelName = undefined) => {
    const cleanedModelProviderName = cleanProviderName(modelProvider);
    const modelProviderInfo = runtimeConfig.ModelProviders[cleanedModelProviderName];
    let modelProviderParam;
    if (modelProvider === BEDROCK_MODEL_PROVIDER_NAME) {
        modelProviderParam = modelProviderInfo.ModelFamilyParams?.[getBedrockModelFamily(modelName)];
    } else {
        modelProviderParam = modelProviderInfo?.ModelProviderParams;
    }

    if (!modelProviderParam) {
        return 'No system prompt found';
    }

    if (isRagEnabled === 'true' || isRagEnabled === true) {
        return modelProviderParam.RAGPromptTemplate;
    } else {
        return modelProviderParam.ChatPromptTemplate;
    }
};

export const createBox = (data) => {
    return <Box variant="p">{data}</Box>;
};

const FormattedModelParams = ({ modelParams }) => {
    const formattedItems = [];
    for (const [paramKey, paramValueWithType] of Object.entries(modelParams)) {
        formattedItems.push(
            <div>
                <SpaceBetween direction="horizontal" size="l">
                    <ValueWithLabel label={paramKey}>{paramValueWithType.Value}</ValueWithLabel>
                </SpaceBetween>
            </div>
        );
    }

    return (
        <SpaceBetween direction="vertical" size="l" data-testid="model-params-container">
            {formattedItems.map(
                (item, index) =>
                    // prettier-ignore
                    <div key={index}>{item}</div> //NOSONAR - unique order not needed here
            )}
        </SpaceBetween>
    );
};

export const escapedNewLineToLineBreakTag = (str, componentId) => {
    try {
        return str.split('\n').map((item, index) => {
            return index === 0 ? item : [<br key={`${componentId}.${index}`} />, item]; //NOSONAR - split new line characters to html br tags once
        });
    } catch (error) {
        return '';
    }
};

export const ModelDetails = () => {
    const {
        state: { selectedDeployment, runtimeConfig }
    } = useContext(HomeContext);

    const promptTemplate =
        selectedDeployment.LlmParams.PromptTemplate !== ''
            ? selectedDeployment.LlmParams.PromptTemplate
            : getSystemPromptFromRuntimeConfig(
                  runtimeConfig,
                  selectedDeployment.LlmParams.ModelProvider,
                  selectedDeployment.ragEnabled,
                  selectedDeployment.LlmParams.ModelId
              );

    return (
        <ColumnLayout columns={4} variant="text-grid" data-testid="model-details-tab">
            <SpaceBetween size="l">
                {selectedDeployment.LlmParams && selectedDeployment.LlmParams.InferenceEndpoint ? (
                    <div>
                        <ValueWithLabel label={'Model provider'}>
                            {MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX].label}
                        </ValueWithLabel>
                        <ValueWithLabel label={'Inference Endpoint'}>
                            {selectedDeployment.LlmParams.InferenceEndpoint}
                        </ValueWithLabel>
                    </div>
                ) : (
                    <div>
                        <ValueWithLabel label={'Model provider'}>
                            {selectedDeployment.LlmParams.ModelProvider}
                        </ValueWithLabel>
                        <ValueWithLabel label={'Model name'}>{selectedDeployment.LlmParams.ModelId}</ValueWithLabel>
                    </div>
                )}

                {Object.keys(selectedDeployment.LlmParams.ModelParams).length > 0 && (
                    <FormattedModelParams modelParams={selectedDeployment.LlmParams.ModelParams} />
                )}
            </SpaceBetween>

            <SpaceBetween size="l">
                <ValueWithLabel label={'Temperature'}>{selectedDeployment.LlmParams.Temperature}</ValueWithLabel>
                <ValueWithLabel label={'Verbose'}>
                    {!selectedDeployment.LlmParams.Verbose ? 'no' : 'yes'}
                </ValueWithLabel>
                <ValueWithLabel label={'Streaming'}>
                    {!selectedDeployment.LlmParams.Streaming ? 'off' : 'on'}
                </ValueWithLabel>
            </SpaceBetween>
            <SpaceBetween size="l">
                <ValueWithLabel label={'System prompt'}>
                    <Box variant="code">{escapedNewLineToLineBreakTag(promptTemplate, useComponentId())}</Box>
                </ValueWithLabel>
            </SpaceBetween>
        </ColumnLayout>
    );
};

export const DisabledKnowledgeBase = () => {
    return (
        <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween size="l">
                <ValueWithLabel label={'Retrieval Augmented Generation (RAG) Enabled'}>
                    <StatusIndicator type={'warning'}>disabled</StatusIndicator>
                </ValueWithLabel>
            </SpaceBetween>
        </ColumnLayout>
    );
};

export const KnowledgeBaseDetails = ({ isInProgress }) => {
    const {
        state: { selectedDeployment, runtimeConfig }
    } = useContext(HomeContext);

    const [showExternalLinkWarningModal, setShowExternalLinkWarningModal] = useState(false);
    const discardModal = () => setShowExternalLinkWarningModal(false);

    if (selectedDeployment.ragEnabled === 'false' || selectedDeployment.ragEnabled === false) {
        return <DisabledKnowledgeBase />;
    }

    let ragEnabledStatus = selectedDeployment.ragEnabled ? 'enabled' : 'disabled';
    let ragEnabledType = selectedDeployment.ragEnabled ? 'success' : 'warning';

    const isDeploymentInActiveState =
        selectedDeployment.status === 'CREATE_COMPLETE' || selectedDeployment.status === 'UPDATE_COMPLETE';

    return (
        <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween size="l">
                <div>
                    <Box variant="awsui-key-label">Knowledge base type</Box>
                    <div>{DEFAULT_STEP_INFO.knowledgeBase.knowledgeBaseType.label}</div>
                </div>

                <div>
                    <Box variant="awsui-key-label">Kendra index ID</Box>
                    {!isDeploymentInActiveState && (
                        <StatusIndicator type="in-progress">create in progress</StatusIndicator>
                    )}
                    {isDeploymentInActiveState && (
                        <div>
                            <Link
                                target="_blank"
                                onFollow={() => {
                                    setShowExternalLinkWarningModal(true);
                                }}
                                external
                            >
                                {selectedDeployment.kendraIndexId ?? ''}
                            </Link>
                            <ExternalLinkWarningModal
                                visible={showExternalLinkWarningModal}
                                onDiscard={discardModal}
                                externalLink={createKendraConsoleLink(
                                    runtimeConfig.AwsRegion,
                                    selectedDeployment.kendraIndexId
                                )}
                                resourceType="Kendra Index"
                            />
                        </div>
                    )}
                </div>
            </SpaceBetween>

            <SpaceBetween size="l">
                <ValueWithLabel label={'Retrieval Augmented Generation (RAG) Enabled'}>
                    <StatusIndicator type={ragEnabledType}>{ragEnabledStatus}</StatusIndicator>
                </ValueWithLabel>

                <ValueWithLabel label={'Maximum number of documents'}>
                    {selectedDeployment.KnowledgeBaseParams.NumberOfDocs?.toString()}
                </ValueWithLabel>
            </SpaceBetween>
        </ColumnLayout>
    );
};
