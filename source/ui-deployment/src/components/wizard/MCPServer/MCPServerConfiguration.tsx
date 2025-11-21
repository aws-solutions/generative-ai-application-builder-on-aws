// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { BaseFormComponentProps } from '../interfaces';
import { MCPServerSettings } from '../interfaces/Steps/MCPServerStep';
import MCPGatewayConfiguration from './MCPGatewayConfiguration';
import MCPRuntimeConfiguration from './MCPRuntimeConfiguration';
import { MCP_SERVER_CREATION_METHOD } from '@/utils/constants';

interface MCPServerConfigurationProps extends BaseFormComponentProps {
    mcpServerData: MCPServerSettings;
    setRequiredFields: (fields: string[]) => void;
    deploymentAction?: string;
    currentRegion?: string;
}

export const MCPServerConfiguration = (props: MCPServerConfigurationProps) => {
    React.useEffect(() => {
        // Reset error state when creation method changes
        // Validation will be handled by individual components
        props.onChangeFn({ inError: false });
    }, [props.mcpServerData.creationMethod]);

    if (props.mcpServerData.creationMethod === MCP_SERVER_CREATION_METHOD.GATEWAY) {
        return <MCPGatewayConfiguration {...props} deploymentAction={props.deploymentAction} />;
    } else if (props.mcpServerData.creationMethod === MCP_SERVER_CREATION_METHOD.RUNTIME) {
        return <MCPRuntimeConfiguration {...props} currentRegion={props.currentRegion} />;
    }

    return <div>Invalid creation method</div>;
};

export default MCPServerConfiguration;
