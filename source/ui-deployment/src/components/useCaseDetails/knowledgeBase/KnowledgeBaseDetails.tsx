// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext } from 'react';
import { Box, ColumnLayout, SpaceBetween, StatusIndicator, StatusIndicatorProps } from '@cloudscape-design/components';
import { KNOWLEDGE_BASE_PROVIDERS } from '../../wizard/steps-config';
import { getBooleanString } from '../../wizard/utils';
import { scoreToKendraMapping } from '../../wizard/KnowledgeBase/helpers';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';
import { KendraKnowledgeBaseDetails } from './KendraKnowledgeBaseDetails';
import { BedrockKnowledgeBaseDetails } from './BedrockKnowledgeBaseDetails';
import { DisabledKnowledgeBase } from './DisabledKnowledgeBase';
import { BaseDetailsContainerProps } from '../types';

export const KnowledgeBaseDetails = ({ selectedDeployment, runtimeConfig }: Partial<BaseDetailsContainerProps>) => {
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
                    <StatusIndicator type={ragEnabledType as StatusIndicatorProps.Type}>
                        {ragEnabledStatus}
                    </StatusIndicator>
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
