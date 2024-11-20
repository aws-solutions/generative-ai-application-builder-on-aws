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

import { ValueWithLabel } from './common-components';
import { useContext, useState } from 'react';
import { Box, ColumnLayout, Link, SpaceBetween } from '@cloudscape-design/components';
import HomeContext from '../../contexts/home.context';
import { getBooleanString } from '../wizard/utils';
import { ExternalLinkWarningModal } from '../commons/external-link-warning-modal';

export const AgentDetails = () => {
    const {
        state: { selectedDeployment }
    } = useContext(HomeContext);

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
                <ValueWithLabel label={'Bedrock agent alias ID'}>
                    {selectedDeployment.AgentParams.BedrockAgentParams.AgentAliasId}
                </ValueWithLabel>
            </SpaceBetween>
            <ValueWithLabel label={'Enable trace'}>
                {getBooleanString(selectedDeployment.AgentParams.BedrockAgentParams.EnableTrace)}
            </ValueWithLabel>
        </ColumnLayout>
    );
};

export const createAgentLink = (stackId: string, bedrockAgentId: string) => {
    const region = stackId.split(':')[3];
    return `https://console.aws.amazon.com/bedrock/home?region=${region}#/agents/${bedrockAgentId}`;
};
