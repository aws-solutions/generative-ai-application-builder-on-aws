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
import { BedrockDetails } from './BedrockDetails';
import { SageMakerDetails } from './SageMakerDetails';
import { useNavigate } from 'react-router-dom';
import HomeContext from '../../contexts/home.context';
import { KNOWLEDGE_BASE_PROVIDERS, BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES } from '../wizard/steps-config';
import { createCfnLink, parseStackName } from '../commons/table-config';
import { ExternalLinkWarningModal } from '../commons/external-link-warning-modal';
import { statusIndicatorTypeSelector } from '../dashboard/deployments';
import {
    BEDROCK_MODEL_PROVIDER_NAME,
    SAGEMAKER_MODEL_PROVIDER_NAME,
    CFN_STACK_STATUS_INDICATOR,
    USECASE_TYPES
} from '../../utils/constants';
import { getBooleanString, getQueryFilterFromDeployment } from '../wizard/utils';
import JsonCodeView from '../commons/json-code-view';
import { scoreToKendraMapping } from '../wizard/KnowledgeBase/helpers';

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

// function to create a direct link to the Kendra console given a Kendra index id
export const createKendraConsoleLink = (region, kendraIndexId) => {
    return `https://console.aws.amazon.com/kendra/home?region=${region}#/indexes/${kendraIndexId}/details`;
};

// Note: there currently does not exist a direct link given a knowledge base ID
// the console link uses the KB name in the URL, which we do not have access to at this point
export const createBedrockKnowledgeBaseConsoleLink = (region, bedrockKnowledgeBaseId) => {
    return `https://console.aws.amazon.com/bedrock/home?region=${region}#/knowledge-bases`;
};

export const createVpcLink = (region, vpcId) => {
    return `https://console.aws.amazon.com/vpcconsole/home?region=${region}#VpcDetails:VpcId=${vpcId}`;
};

export const GeneralConfig = () => {
    const {
        state: { selectedDeployment, runtimeConfig }
    } = useContext(HomeContext);

    const [showCloudwatchModal, setShowCloudwatchModal] = useState(false);
    const [showCfnModal, setShowCfnModal] = useState(false);
    const [showVpcModal, setShowVpcModal] = useState(false);

    const isEmptyOrUndefined = (value) => {
        return value === undefined || value === '' || value === null;
    };

    const existingUserPoolId = selectedDeployment.AuthenticationParams?.CognitoParams?.ExistingUserPoolId;
    const existingUserPoolClientId = selectedDeployment.AuthenticationParams?.CognitoParams?.ExistingUserPoolClientId;

    const isVpcEnabled = selectedDeployment.vpcEnabled ? selectedDeployment.vpcEnabled.toLowerCase() === 'yes' : false;

    return (
        <Container header={<Header variant="h2">Deployment details</Header>} data-testid="deployment-details-container">
            <ColumnLayout columns={4} variant="text-grid">
                <ValueWithLabel label={'Type'}>{selectedDeployment.UseCaseType ?? USECASE_TYPES.TEXT}</ValueWithLabel>
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

                {selectedDeployment.deployUI && (
                    <ValueWithLabel label={'Deploy UI'}>{selectedDeployment.deployUI}</ValueWithLabel>
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

                <ValueWithLabel label="VPC Enabled">
                    <StatusIndicator
                        type={isVpcEnabled ? CFN_STACK_STATUS_INDICATOR.SUCCESS : CFN_STACK_STATUS_INDICATOR.WARNING}
                    >
                        {selectedDeployment.vpcEnabled}
                    </StatusIndicator>
                </ValueWithLabel>

                {isVpcEnabled && selectedDeployment.vpcId && (
                    <Box data-testid="vpc-link-with-modal">
                        <ValueWithLabel label={'VPC ID'}>
                            {
                                <>
                                    <Link
                                        target="_blank"
                                        onFollow={() => {
                                            setShowVpcModal(true);
                                        }}
                                        external
                                    >
                                        {selectedDeployment.vpcId}
                                    </Link>
                                    <ExternalLinkWarningModal
                                        // data-testid="vpc-external-link-modal"
                                        visible={showVpcModal}
                                        onDiscard={() => setShowVpcModal(false)}
                                        externalLink={createVpcLink(runtimeConfig.AwsRegion, selectedDeployment.vpcId)}
                                        resourceType="VPC"
                                    />
                                </>
                            }
                        </ValueWithLabel>
                    </Box>
                )}

                {existingUserPoolId && (
                    <ValueWithLabel label={'Existing User Pool Id'}>{existingUserPoolId}</ValueWithLabel>
                )}

                {existingUserPoolClientId && (
                    <ValueWithLabel label={'Existing User Pool Client Id'}>{existingUserPoolClientId}</ValueWithLabel>
                )}

                {isVpcEnabled && selectedDeployment.privateSubnetIds && (
                    <ValueWithLabel label={'Subnet IDs'}>
                        {selectedDeployment.privateSubnetIds.join(', ')}
                    </ValueWithLabel>
                )}

                {isVpcEnabled && selectedDeployment.securityGroupIds && (
                    <ValueWithLabel label={'Security Group IDs'}>
                        {selectedDeployment.securityGroupIds.join(', ')}
                    </ValueWithLabel>
                )}
            </ColumnLayout>
        </Container>
    );
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
        state: { selectedDeployment }
    } = useContext(HomeContext);

    return (
        <ColumnLayout columns={2} variant="text-grid" data-testid="model-details-tab">
            {
                {
                    [BEDROCK_MODEL_PROVIDER_NAME]: <BedrockDetails />,
                    [SAGEMAKER_MODEL_PROVIDER_NAME]: <SageMakerDetails />
                }[selectedDeployment.LlmParams.ModelProvider]
            }
            {Object.keys(selectedDeployment.LlmParams.ModelParams).length > 0 && (
                <FormattedModelParams modelParams={selectedDeployment.LlmParams.ModelParams} />
            )}

            <SpaceBetween size="l">
                <ValueWithLabel label={'Temperature'}>{selectedDeployment.LlmParams.Temperature}</ValueWithLabel>
                <ValueWithLabel label={'Verbose'}>{selectedDeployment.LlmParams.Verbose ? 'on' : 'off'}</ValueWithLabel>
                <ValueWithLabel label={'Streaming'}>
                    {selectedDeployment.LlmParams.Streaming ? 'on' : 'off'}
                </ValueWithLabel>
            </SpaceBetween>
        </ColumnLayout>
    );
};

export const DisabledKnowledgeBase = () => {
    return (
        <ColumnLayout columns={2} variant="text-grid" data-testid="kb-disabled-tab">
            <SpaceBetween size="l">
                <ValueWithLabel label={'Retrieval Augmented Generation (RAG) Enabled'}>
                    <StatusIndicator type={'warning'}>disabled</StatusIndicator>
                </ValueWithLabel>
            </SpaceBetween>
        </ColumnLayout>
    );
};

export const KnowledgeBaseDetails = () => {
    const {
        state: { selectedDeployment, runtimeConfig }
    } = useContext(HomeContext);

    if (selectedDeployment.ragEnabled === 'false' || selectedDeployment.ragEnabled === false) {
        return <DisabledKnowledgeBase />;
    }

    let ragEnabledStatus = selectedDeployment.ragEnabled ? 'enabled' : 'disabled';
    let ragEnabledType = selectedDeployment.ragEnabled ? 'success' : 'warning';

    const isDeploymentInActiveState =
        selectedDeployment.status === 'CREATE_COMPLETE' || selectedDeployment.status === 'UPDATE_COMPLETE';

    return (
        <ColumnLayout columns={2} variant="text-grid" data-testid="kb-details-tab">
            <SpaceBetween size="l">
                <div>
                    <Box variant="awsui-key-label">Knowledge base type</Box>
                    <div>{selectedDeployment.knowledgeBaseType}</div>
                </div>

                {selectedDeployment.knowledgeBaseType === KNOWLEDGE_BASE_PROVIDERS.kendra && (
                    <KendraKnowledgeBaseDetails
                        isDeploymentInActiveState={isDeploymentInActiveState}
                        selectedDeployment={selectedDeployment}
                        runtimeConfig={runtimeConfig}
                        deploymentStatus={selectedDeployment.status}
                    />
                )}
                {selectedDeployment.knowledgeBaseType === KNOWLEDGE_BASE_PROVIDERS.bedrock && (
                    <BedrockKnowledgeBaseDetails
                        isDeploymentInActiveState={isDeploymentInActiveState}
                        selectedDeployment={selectedDeployment}
                        runtimeConfig={runtimeConfig}
                        deploymentStatus={selectedDeployment.status}
                    />
                )}
            </SpaceBetween>

            <SpaceBetween size="l" data-testid="kb-settings-tab">
                <ValueWithLabel label={'Retrieval Augmented Generation (RAG) Enabled'}>
                    <StatusIndicator type={ragEnabledType}>{ragEnabledStatus}</StatusIndicator>
                </ValueWithLabel>

                <ValueWithLabel label={'Maximum number of documents'}>
                    {selectedDeployment.KnowledgeBaseParams.NumberOfDocs?.toString()}
                </ValueWithLabel>

                <ValueWithLabel label={'Score threshold'}>
                    {selectedDeployment.knowledgeBaseType === KNOWLEDGE_BASE_PROVIDERS.kendra
                        ? scoreToKendraMapping(selectedDeployment.KnowledgeBaseParams.ScoreThreshold)
                        : selectedDeployment.KnowledgeBaseParams.ScoreThreshold}
                </ValueWithLabel>

                <ValueWithLabel label={'Static response when no documents found'}>
                    {selectedDeployment.KnowledgeBaseParams.NoDocsFoundResponse
                        ? selectedDeployment.KnowledgeBaseParams.NoDocsFoundResponse
                        : '-'}
                </ValueWithLabel>

                <ValueWithLabel label={'Display document source'}>
                    {getBooleanString(selectedDeployment.KnowledgeBaseParams.ReturnSourceDocs)}
                </ValueWithLabel>
            </SpaceBetween>
        </ColumnLayout>
    );
};

const KendraKnowledgeBaseDetails = ({
    isDeploymentInActiveState,
    selectedDeployment,
    runtimeConfig,
    deploymentStatus
}) => {
    const [showExternalLinkWarningModal, setShowExternalLinkWarningModal] = useState(false);
    const discardModal = () => setShowExternalLinkWarningModal(false);

    const queryFilter = getQueryFilterFromDeployment(selectedDeployment);

    return (
        <div>
            <Box variant="awsui-key-label">Kendra index ID</Box>
            {deploymentStatus === 'CREATE_IN_PROGRESS' && !selectedDeployment.kendraIndexId && (
                <StatusIndicator type="in-progress">{deploymentStatus}</StatusIndicator>
            )}
            {deploymentStatus === 'CREATE_IN_PROGRESS' && (selectedDeployment.kendraIndexId ? '-' : '')}
            {isDeploymentInActiveState && (
                <SpaceBetween size="s">
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

                    {queryFilter && (
                        <ValueWithLabel label="Attribute filter">
                            <JsonCodeView content={queryFilter} />
                        </ValueWithLabel>
                    )}
                </SpaceBetween>
            )}
        </div>
    );
};

const BedrockKnowledgeBaseDetails = ({
    isDeploymentInActiveState,
    selectedDeployment,
    runtimeConfig,
    deploymentStatus
}) => {
    const [showExternalLinkWarningModal, setShowExternalLinkWarningModal] = useState(false);
    const discardModal = () => setShowExternalLinkWarningModal(false);

    const queryFilter = getQueryFilterFromDeployment(selectedDeployment);

    return (
        <div>
            <Box variant="awsui-key-label">Bedrock Knowledge base ID</Box>
            {deploymentStatus === 'CREATE_IN_PROGRESS' && !selectedDeployment.bedrockKnowledgeBaseId && (
                <Box>
                    <StatusIndicator type="in-progress">{deploymentStatus}</StatusIndicator>
                    {!isDeploymentInActiveState && (selectedDeployment.bedrockKnowledgeBaseId ?? '-')}
                </Box>
            )}
            {!isDeploymentInActiveState && (selectedDeployment.bedrockKnowledgeBaseId ?? '-')}
            {isDeploymentInActiveState && (
                <SpaceBetween size="s">
                    <Link
                        target="_blank"
                        onFollow={() => {
                            setShowExternalLinkWarningModal(true);
                        }}
                        external
                    >
                        {selectedDeployment.bedrockKnowledgeBaseId ?? ''}
                    </Link>
                    <ExternalLinkWarningModal
                        visible={showExternalLinkWarningModal}
                        onDiscard={discardModal}
                        externalLink={createBedrockKnowledgeBaseConsoleLink(
                            runtimeConfig.AwsRegion,
                            selectedDeployment.bedrockKnowledgeBaseId
                        )}
                        resourceType="Bedrock Knowledge base"
                    />

                    {queryFilter && (
                        <ValueWithLabel label="Attribute filter">
                            <JsonCodeView content={queryFilter} />
                        </ValueWithLabel>
                    )}
                    {selectedDeployment.KnowledgeBaseParams?.BedrockKnowledgeBaseParams?.OverrideSearchType && (
                        <ValueWithLabel label="Override Search Type">
                            {
                                BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES.find(
                                    (item) =>
                                        item.value ===
                                        selectedDeployment.KnowledgeBaseParams?.BedrockKnowledgeBaseParams
                                            ?.OverrideSearchType
                                ).label
                            }
                        </ValueWithLabel>
                    )}
                </SpaceBetween>
            )}
        </div>
    );
};
