// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Box, Link, StatusIndicator, SpaceBetween } from '@cloudscape-design/components';
import { ExternalLinkWarningModal } from '../../commons/external-link-warning-modal';
import { createKendraConsoleLink } from '../../../utils/linkUtils';
import { getQueryFilterFromDeployment } from '../../wizard/utils';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';
import JsonCodeView from '../../commons/json-code-view';
import { BaseDetailsContainerProps } from '../types';

interface KendraKnowledgeBaseDetailsProps extends Partial<BaseDetailsContainerProps> {
    isDeploymentInActiveState: boolean;
    deploymentStatus: string;
}

/**
 * Component that displays details about a Kendra knowledge base
 * Shows the Kendra index ID with a link to the AWS console
 * Displays deployment status indicators and attribute filters if present
 *
 * @param {boolean} isDeploymentInActiveState - Whether the deployment is in an active state
 * @param {Object} selectedDeployment - The selected deployment containing kendraIndexId
 * @param {Object} runtimeConfig - Runtime configuration containing AWS region
 * @param {string} deploymentStatus - Current status of the deployment
 * @returns {JSX.Element} Rendered component with Kendra knowledge base details
 */
export const KendraKnowledgeBaseDetails: React.FC<KendraKnowledgeBaseDetailsProps> = ({
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
