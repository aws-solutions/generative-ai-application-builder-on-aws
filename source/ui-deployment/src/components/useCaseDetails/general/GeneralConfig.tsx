// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Badge, Box, ColumnLayout, Link, SpaceBetween, StatusIndicator, StatusIndicatorProps } from '@cloudscape-design/components';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';
import { ExternalLinkWarningModal } from '../../commons/external-link-warning-modal';
import { createCfnLink, parseStackName } from '../../commons/table-config';
import { createVpcLink } from '../../../utils/linkUtils';
import { statusIndicatorTypeSelector } from '@/components/dashboard/deployments';
import { CFN_STACK_STATUS_INDICATOR, USECASE_TYPES } from '../../../utils/constants';
import { BaseDetailsContainerProps } from '../types';
import { getBooleanString } from '@/components/wizard/utils';

export const GeneralConfig = ({ selectedDeployment, runtimeConfig }: Partial<BaseDetailsContainerProps>) => {
    const [showCloudwatchModal, setShowCloudwatchModal] = useState(false);
    const [showCfnModal, setShowCfnModal] = useState(false);
    const [showVpcModal, setShowVpcModal] = useState(false);

    const isEmptyOrUndefined = (value: any) => {
        return value === undefined || value === '' || value === null;
    };

    const existingUserPoolId = selectedDeployment.AuthenticationParams?.CognitoParams?.ExistingUserPoolId;
    const existingUserPoolClientId = selectedDeployment.AuthenticationParams?.CognitoParams?.ExistingUserPoolClientId;

    const isVpcEnabled = selectedDeployment.vpcEnabled ? selectedDeployment.vpcEnabled.toLowerCase() === 'yes' : false;
    const deploymentStatus = (selectedDeployment as any)?.status ?? (selectedDeployment as any)?.Status ?? 'unknown';

    return (
        <ColumnLayout columns={4} variant="text-grid">
            <ValueWithLabel label={'Type'}>{selectedDeployment.UseCaseType ?? USECASE_TYPES.TEXT}</ValueWithLabel>
            <ValueWithLabel label={'Name'}>{selectedDeployment.Name}</ValueWithLabel>

            {!isEmptyOrUndefined(selectedDeployment.Description) && (
                <ValueWithLabel label={'Description'}>{selectedDeployment.Description}</ValueWithLabel>
            )}
            {selectedDeployment.CreatedDate && (
                <ValueWithLabel label={'Creation Date'}>
                    {new Date(selectedDeployment.CreatedDate).toLocaleString()}
                </ValueWithLabel>
            )}
            {selectedDeployment.UseCaseId && (
                <ValueWithLabel label={'Use Case ID'}>{selectedDeployment.UseCaseId}</ValueWithLabel>
            )}

            {selectedDeployment.VoicePhoneNumber && (
                <ValueWithLabel label={'Voice Phone Number'}>{selectedDeployment.VoicePhoneNumber}</ValueWithLabel>
            )}

            <ValueWithLabel label={'Enabled Channels'}>
                <SpaceBetween direction="horizontal" size="xs">
                    {selectedDeployment.cloudFrontWebUrl && <Badge color="blue">Web</Badge>}
                    {selectedDeployment.VoicePhoneNumber && <Badge color="green">Voice</Badge>}
                    {!selectedDeployment.cloudFrontWebUrl && !selectedDeployment.VoicePhoneNumber && <Box>-</Box>}
                </SpaceBetween>
            </ValueWithLabel>

            {selectedDeployment.deployUI && (
                <ValueWithLabel label={'Deploy UI'}>{selectedDeployment.deployUI}</ValueWithLabel>
            )}

            <ValueWithLabel label={'Status'}>
                <StatusIndicator
                    type={statusIndicatorTypeSelector(deploymentStatus) as StatusIndicatorProps.Type}
                >
                    {deploymentStatus}
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
                    type={
                        (isVpcEnabled
                            ? CFN_STACK_STATUS_INDICATOR.SUCCESS
                            : CFN_STACK_STATUS_INDICATOR.WARNING) as StatusIndicatorProps.Type
                    }
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
                <ValueWithLabel label={'Subnet IDs'}>{selectedDeployment.privateSubnetIds.join(', ')}</ValueWithLabel>
            )}

            {isVpcEnabled && selectedDeployment.securityGroupIds && (
                <ValueWithLabel label={'Security Group IDs'}>
                    {selectedDeployment.securityGroupIds.join(', ')}
                </ValueWithLabel>
            )}

            {'ProvisionedConcurrencyValue' in (selectedDeployment ?? {}) && (
                <ValueWithLabel label={'Provisioned Concurrency'}>
                    {selectedDeployment.ProvisionedConcurrencyValue > 0
                        ? `Enabled (${selectedDeployment.ProvisionedConcurrencyValue})`
                        : 'Disabled'}
                </ValueWithLabel>
            )}

            {selectedDeployment.UseCaseType === USECASE_TYPES.MCP_SERVER && (
                <ValueWithLabel label={'Agentcore Service'}>
                    {selectedDeployment.MCPParams?.GatewayParams ? 'Gateway' : 'Runtime'}

                </ValueWithLabel>
            )}

            {'FeedbackEnabled' in (selectedDeployment.FeedbackParams ?? {}) && (
                <ValueWithLabel label={'Enable Feedback'}>
                    {getBooleanString(selectedDeployment.FeedbackParams.FeedbackEnabled)}
                </ValueWithLabel>
            )}
        </ColumnLayout>
    );
};
