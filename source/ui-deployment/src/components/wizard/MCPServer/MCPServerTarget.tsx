// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FormField, Input, SpaceBetween, InputProps } from '@cloudscape-design/components';
import { InfoLink } from '../../commons';
import { GATEWAY_REST_API_OUTBOUND_AUTH_TYPES, MCP_ENDPOINT_PATTERN } from '@/utils/constants';
import { TargetConfiguration } from '../interfaces/Steps/MCPServerStep';
import OutboundAuth from './OutboundAuth';
import { updateNumFieldsInError } from '../utils';
import { mcpServerInfoPanel } from './helpers';

interface MCPServerTargetProps {
    target: TargetConfiguration;
    targetIndex: number;
    onTargetChange: (updates: Partial<TargetConfiguration>) => void;
    endpointError?: string;
    providerArnError?: string;
    setNumFieldsInError?: (callback: (prev: number) => number) => void;
    setHelpPanelContent?: (content: any) => void;
}

export const MCPServerTarget = ({
    target,
    targetIndex,
    onTargetChange,
    endpointError,
    providerArnError,
    setNumFieldsInError,
    setHelpPanelContent
}: MCPServerTargetProps) => {
    const [currentEndpointError, setCurrentEndpointError] = React.useState(endpointError || '');

    const handleMcpEndpointChange = (detail: InputProps.ChangeDetail) => {
        const mcpEndpoint = detail.value;
        onTargetChange({ mcpEndpoint });

        let errors = '';
        if (mcpEndpoint.length === 0) {
            errors += 'Required field. ';
        } else if (!MCP_ENDPOINT_PATTERN.test(mcpEndpoint)) {
            errors += 'Invalid MCP endpoint format. Must be a valid HTTPS URL.';
        } else {
            try {
                const url = new URL(mcpEndpoint);
                const hostname = url.hostname.toLowerCase();

                // Block localhost and loopback addresses
                if (
                    hostname === 'localhost' ||
                    hostname === '127.0.0.1' ||
                    hostname.startsWith('127.') ||
                    hostname === '0.0.0.0' ||
                    hostname === '::1' ||
                    hostname === '::' ||
                    hostname === '[::1]' ||
                    hostname === '[::]'
                ) {
                    errors += 'MCP endpoint cannot use localhost or loopback addresses. ';
                }

                // Block private IP ranges (RFC 1918)
                if (
                    hostname.startsWith('10.') ||
                    hostname.startsWith('192.168.') ||
                    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
                ) {
                    errors += 'MCP endpoint cannot use private IP addresses. ';
                }

                // Block link-local and cloud metadata endpoints
                if (hostname.startsWith('169.254.') || hostname === 'metadata' || hostname.includes('metadata.')) {
                    errors += 'MCP endpoint cannot use link-local or metadata addresses. ';
                }
            } catch (e) {
                // URL parsing failed - already caught by pattern check
            }
        }

        if (setNumFieldsInError) {
            updateNumFieldsInError(errors, currentEndpointError, setNumFieldsInError);
        }
        setCurrentEndpointError(errors);
    };

    const handleAuthChange = (authUpdates: any) => {
        onTargetChange({
            outboundAuth: {
                ...target.outboundAuth,
                ...authUpdates
            }
        });
    };

    return (
        <SpaceBetween size="l">
            <FormField
                label="MCP Endpoint - required"
                description="Enter the URL endpoint of the MCP server"
                errorText={currentEndpointError}
                data-testid={`mcp-endpoint-field-${targetIndex + 1}`}
                info={
                    setHelpPanelContent ? (
                        <InfoLink
                            onFollow={() => setHelpPanelContent(mcpServerInfoPanel.mcpEndpoint)}
                            ariaLabel="Information about MCP endpoint"
                        />
                    ) : undefined
                }
            >
                <Input
                    value={target.mcpEndpoint || ''}
                    onChange={({ detail }) => handleMcpEndpointChange(detail)}
                    placeholder="https://your-mcp-server.example.com/mcp"
                    data-testid={`mcp-endpoint-input-${targetIndex + 1}`}
                />
            </FormField>

            {target.outboundAuth && (
                <OutboundAuth
                    outboundAuth={target.outboundAuth}
                    onAuthChange={handleAuthChange}
                    targetIndex={targetIndex}
                    excludeAuthTypes={[GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY]}
                    providerArnError={providerArnError}
                    setNumFieldsInError={setNumFieldsInError}
                    setHelpPanelContent={setHelpPanelContent}
                />
            )}
        </SpaceBetween>
    );
};

export default MCPServerTarget;
