// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Container, Header, SpaceBetween, Button } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../interfaces';
import { MCPServerSettings, TargetConfiguration } from '../interfaces/Steps/MCPServerStep';
import MCPTargetConfiguration from './MCPTargetConfiguration';
import {
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    API_KEY_LOCATION,
    MAX_MCP_TARGETS
} from '@/utils/constants';

interface MCPGatewayConfigurationProps extends BaseFormComponentProps {
    mcpServerData: MCPServerSettings;
    setRequiredFields: (fields: string[]) => void;
    deploymentAction?: string;
}

export const MCPGatewayConfiguration = (props: MCPGatewayConfigurationProps) => {
    const currentTargetCount = props.mcpServerData.targets?.length || 0;
    const canAddMoreTargets = currentTargetCount < MAX_MCP_TARGETS;

    const addTarget = () => {
        if (!canAddMoreTargets) return;

        const newTarget: TargetConfiguration = {
            id: Date.now().toString(),
            targetName: '',
            targetDescription: '',
            targetType: GATEWAY_TARGET_TYPES.LAMBDA,
            uploadedSchema: null,
            uploadedSchemaKey: undefined,
            lambdaArn: '',
            mcpEndpoint: '',
            outboundAuth: {
                authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                providerArn: '',
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: []
                    },
                    apiKeyConfig: {
                        location: API_KEY_LOCATION.HEADER,
                        parameterName: '',
                        prefix: ''
                    }
                }
            }
        };
        props.onChangeFn({
            targets: [...(props.mcpServerData.targets || []), newTarget]
        });
    };

    const removeTarget = (targetId: string) => {
        const updatedTargets = props.mcpServerData.targets?.filter((target) => target.id !== targetId) || [];
        props.onChangeFn({ targets: updatedTargets });
    };

    const updateTarget = (targetId: string, updates: Partial<TargetConfiguration>) => {
        const updatedTargets =
            props.mcpServerData.targets?.map((target) =>
                target.id === targetId ? { ...target, ...updates } : target
            ) || [];
        props.onChangeFn({ targets: updatedTargets });
    };

    return (
        <Container
            header={<Header variant="h2">Gateway Configuration</Header>}
            data-testid="mcp-gateway-configuration-container"
        >
            <SpaceBetween size="l">
                {props.mcpServerData.targets?.map((target, index) => (
                    <MCPTargetConfiguration
                        key={target.id}
                        target={target}
                        index={index}
                        onUpdateTarget={updateTarget}
                        onRemoveTarget={removeTarget}
                        canRemove={!!(props.mcpServerData.targets && props.mcpServerData.targets.length > 1)}
                        setNumFieldsInError={props.setNumFieldsInError}
                        setHelpPanelContent={props.setHelpPanelContent}
                        allTargets={props.mcpServerData.targets}
                        deploymentAction={props.deploymentAction}
                        originalTargetIds={props.mcpServerData.originalTargetIds || []}
                    />
                ))}

                <Container>
                    <Button
                        variant="link"
                        iconName="add-plus"
                        onClick={addTarget}
                        disabled={!canAddMoreTargets}
                        data-testid="add-target-button"
                    >
                        Add another target {!canAddMoreTargets && `(Maximum of ${MAX_MCP_TARGETS} targets reached)`}
                    </Button>
                </Container>
            </SpaceBetween>
        </Container>
    );
};

export default MCPGatewayConfiguration;
