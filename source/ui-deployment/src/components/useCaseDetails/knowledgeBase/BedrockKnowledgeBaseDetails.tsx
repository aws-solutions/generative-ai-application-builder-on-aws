// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Box, Link, StatusIndicator, SpaceBetween } from '@cloudscape-design/components';
import { ExternalLinkWarningModal } from '../../commons/external-link-warning-modal';
import { createBedrockKnowledgeBaseConsoleLink } from '../../../utils/linkUtils';
import { getQueryFilterFromDeployment } from '../../wizard/utils';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';
import JsonCodeView from '../../commons/json-code-view';
import { BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES } from '../../wizard/steps-config';
import { BaseDetailsContainerProps } from '../types';

interface BedrockKnowledgeBaseDetailsProps extends Partial<BaseDetailsContainerProps> {
    isDeploymentInActiveState: boolean;
    deploymentStatus: string;
}

/**
 * Component that displays details for a Bedrock Knowledge Base deployment
 *
 * @param isDeploymentInActiveState - Boolean indicating if deployment is in active state
 * @param selectedDeployment - The selected deployment object containing knowledge base details
 * @param runtimeConfig - Configuration object containing AWS region
 * @param deploymentStatus - Current status of the deployment
 * @returns JSX element displaying knowledge base details including ID, filters and search type
 */
export const BedrockKnowledgeBaseDetails: React.FC<BedrockKnowledgeBaseDetailsProps> = ({
    isDeploymentInActiveState,
    selectedDeployment,
    runtimeConfig,
    deploymentStatus
}) => {
    const [showExternalLinkWarningModal, setShowExternalLinkWarningModal] = useState<boolean>(false);
    const discardModal = (): void => setShowExternalLinkWarningModal(false);

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
                                )?.label
                            }
                        </ValueWithLabel>
                    )}
                </SpaceBetween>
            )}
        </div>
    );
};
