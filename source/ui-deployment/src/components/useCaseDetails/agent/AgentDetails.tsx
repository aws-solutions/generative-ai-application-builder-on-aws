// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Box, ColumnLayout, Link, SpaceBetween } from '@cloudscape-design/components';
import { getBooleanString } from '../../wizard/utils';
import { ExternalLinkWarningModal } from '../../commons/external-link-warning-modal';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';
import { BaseDetailsContainerProps } from '../types';

export const AgentDetails = ({ selectedDeployment }: Partial<BaseDetailsContainerProps>) => {
    const [showAgentModal, setShowAgentModal] = useState(false);

    return (
        <ColumnLayout columns={2} variant="text-grid" data-testid="agent-details-tab">
            <SpaceBetween size="l">
                <Box data-testid="agent-link-with-modal">
                    <Box variant="awsui-key-label">Bedrock agent ID</Box>
                    <Link
                        target="_blank"
                        onFollow={() => {
                            setShowAgentModal(true);
                        }}
                        external
                    >
                        {selectedDeployment.AgentParams.BedrockAgentParams.AgentId}
                    </Link>
                    <ExternalLinkWarningModal
                        visible={showAgentModal}
                        onDiscard={() => setShowAgentModal(false)}
                        externalLink={createAgentLink(
                            selectedDeployment.StackId,
                            selectedDeployment.AgentParams.BedrockAgentParams.AgentId
                        )}
                        resourceType="Bedrock Agent"
                    />
                </Box>
                <ValueWithLabel label={'Bedrock agent alias ID'} data-testid={'agent-alias-id'}>
                    {selectedDeployment.AgentParams.BedrockAgentParams.AgentAliasId}
                </ValueWithLabel>
            </SpaceBetween>
            <ValueWithLabel label={'Enable trace'} data-testid="enable-trace">
                {getBooleanString(selectedDeployment.AgentParams.BedrockAgentParams.EnableTrace)}
            </ValueWithLabel>
        </ColumnLayout>
    );
};

export const createAgentLink = (stackId: string, bedrockAgentId: string) => {
    const region = stackId.split(':')[3];
    return `https://console.aws.amazon.com/bedrock/home?region=${region}#/agents/${bedrockAgentId}`;
};
