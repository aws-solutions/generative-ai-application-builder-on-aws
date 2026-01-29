// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween, Container, Header, Button, ColumnLayout, StatusIndicator } from '@cloudscape-design/components';
import { MCPServerSettings, TargetConfiguration } from '../interfaces/Steps/MCPServerStep';
import { ReviewSectionProps } from '../interfaces/Steps';
import { WIZARD_PAGE_INDEX } from '../steps-config';
import { ValueWithLabel } from '@/utils/ValueWithLabel';
import {
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    MCP_CREATION_METHOD_OPTIONS,
    MCP_TARGET_TYPE_OPTIONS,
    MCP_AUTH_TYPE_OPTIONS,
    TARGETS_WITH_AUTH,
    TARGETS_WITH_SCHEMA
} from '@/utils/constants';

// Utility function for upload status indicator
const renderUploadStatus = (target: TargetConfiguration, successText = 'Uploaded') => {
    if (target.uploadFailed) {
        return (
            <Box display="inline" margin={{ left: 's' }}>
                <StatusIndicator type="error">Upload Failed</StatusIndicator>
            </Box>
        );
    }

    if (target.uploadedSchemaKey) {
        return (
            <Box display="inline" margin={{ left: 's' }}>
                <StatusIndicator type="success">{successText}</StatusIndicator>
            </Box>
        );
    }

    return null;
};

export interface MCPReviewProps {
    info: {
        useCase: any;
        mcpServer: MCPServerSettings;
    };
    setActiveStepIndex: (index: number) => void;
}

interface MCPUseCaseReviewProps extends ReviewSectionProps {
    useCaseData: any;
}

export const MCPReview = ({ info: { useCase, mcpServer }, setActiveStepIndex }: MCPReviewProps) => {
    return (
        <Box margin={{ bottom: 'l' }} data-testid="review-deployment-component">
            <SpaceBetween size="xxl">
                <MCPUseCaseReview
                    header="Step 1: Use case"
                    useCaseData={useCase}
                    setActiveStepIndex={setActiveStepIndex}
                />

                <MCPServerReview
                    header="Step 2: MCP Server Configuration"
                    mcpServerData={mcpServer}
                    setActiveStepIndex={setActiveStepIndex}
                />
            </SpaceBetween>
        </Box>
    );
};

export const MCPUseCaseReview = (props: MCPUseCaseReviewProps) => {
    return (
        <SpaceBetween size="xs">
            <Header
                variant="h3"
                headingTagOverride="h2"
                actions={<Button onClick={() => props.setActiveStepIndex(WIZARD_PAGE_INDEX.USE_CASE)}>Edit</Button>}
            >
                {props.header}
            </Header>
            <Container
                header={
                    <Header variant="h2" headingTagOverride="h3">
                        Use case options
                    </Header>
                }
                data-testid="review-use-case-details-container"
            >
                <ColumnLayout columns={2} variant="text-grid" data-testid="review-use-case-details">
                    <ValueWithLabel label="Use case type">{props.useCaseData.useCaseType}</ValueWithLabel>
                    <ValueWithLabel label="Use case name">{props.useCaseData.useCaseName}</ValueWithLabel>
                    <ValueWithLabel label="Description">{props.useCaseData.useCaseDescription}</ValueWithLabel>
                </ColumnLayout>
            </Container>
        </SpaceBetween>
    );
};

// MCP Server Review component
const MCPServerReview = ({
    header,
    mcpServerData,
    setActiveStepIndex
}: {
    header: string;
    mcpServerData: MCPServerSettings;
    setActiveStepIndex: (index: number) => void;
}) => {
    const renderTargetConfiguration = (target: TargetConfiguration, index: number) => {
        const isUploaded = !!target.uploadedSchemaKey;
        const fileName = target.uploadedSchemaFileName || target.uploadedSchema?.name || 'No file selected';

        return (
            <Container
                key={target.id}
                header={
                    <Header variant="h3">
                        Target Configuration {index + 1}
                        {renderUploadStatus(target)}
                    </Header>
                }
                data-testid={`target-container-${index}`}
            >
                <ColumnLayout columns={2} variant="text-grid">
                    <div>
                        <Box variant="awsui-key-label">Target Name</Box>
                        <div>{target.targetName}</div>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Target Type</Box>
                        <div>{MCP_TARGET_TYPE_OPTIONS.get(target.targetType)?.label}</div>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Description</Box>
                        <div>{target.targetDescription}</div>
                    </div>

                    {target.targetType === GATEWAY_TARGET_TYPES.LAMBDA && target.lambdaArn && (
                        <div>
                            <Box variant="awsui-key-label">Lambda Function ARN</Box>
                            <div>{target.lambdaArn}</div>
                        </div>
                    )}

                    {target.targetType === GATEWAY_TARGET_TYPES.MCP_SERVER && (
                        <div>
                            <Box variant="awsui-key-label">MCP Endpoint</Box>
                            <div>{target.mcpEndpoint || 'Not specified'}</div>
                        </div>
                    )}

                    {TARGETS_WITH_SCHEMA.includes(target.targetType) && (
                        <div>
                            <Box variant="awsui-key-label">{isUploaded ? 'Uploaded Schema File' : 'Schema File'}</Box>
                            <div>{fileName}</div>
                        </div>
                    )}

                    {TARGETS_WITH_AUTH.includes(target.targetType) && target.outboundAuth && (
                        <>
                            <div>
                                <Box variant="awsui-key-label">Authentication Type</Box>
                                <div>{MCP_AUTH_TYPE_OPTIONS.get(target.outboundAuth.authType as GATEWAY_REST_API_OUTBOUND_AUTH_TYPES)?.label}</div>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Authentication Configured</Box>
                                <div>
                                    {target.outboundAuth.authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.NO_AUTH
                                        ? 'No'
                                        : target.outboundAuth.providerArn
                                          ? 'Yes'
                                          : 'No'}
                                </div>
                            </div>
                        </>
                    )}
                </ColumnLayout>
            </Container>
        );
    };

    return (
        <Container
            header={
                <Header
                    variant="h2"
                    actions={
                        <Button
                            variant="link"
                            onClick={() => setActiveStepIndex(1)}
                            data-testid="edit-mcp-server-button"
                        >
                            Edit
                        </Button>
                    }
                >
                    {header}
                </Header>
            }
            data-testid="review-mcp-server-container"
        >
            <SpaceBetween size="l">
                <div>
                    <Box variant="awsui-key-label">Creation Method</Box>
                    <div>{MCP_CREATION_METHOD_OPTIONS.get(mcpServerData?.creationMethod)?.label}</div>
                </div>

                {mcpServerData?.creationMethod === MCP_SERVER_CREATION_METHOD.GATEWAY && mcpServerData?.targets && (
                    <SpaceBetween size="m">
                        <Box variant="h3">Target Configurations</Box>
                        {mcpServerData.targets.map((target, index) =>
                            renderTargetConfiguration(target, index)
                        )}
                    </SpaceBetween>
                )}

                {mcpServerData?.creationMethod === MCP_SERVER_CREATION_METHOD.RUNTIME && mcpServerData?.ecrConfig?.imageUri && (
                    <SpaceBetween size="m">
                        <div>
                            <Box variant="awsui-key-label">ECR Image URI</Box>
                            <div>{mcpServerData.ecrConfig.imageUri}</div>
                        </div>
                        
                        {mcpServerData.ecrConfig.environmentVariables && mcpServerData.ecrConfig.environmentVariables.length > 0 && (
                            <div>
                                <Box variant="awsui-key-label">Environment Variables</Box>
                                <div>
                                    {mcpServerData.ecrConfig.environmentVariables.map((envVar, index) => (
                                        <div key={index} style={{ marginBottom: '4px' }}>
                                            <strong>{envVar.key}</strong>: {envVar.value}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </SpaceBetween>
                )}
            </SpaceBetween>
        </Container>
    );
};

export default MCPReview;
