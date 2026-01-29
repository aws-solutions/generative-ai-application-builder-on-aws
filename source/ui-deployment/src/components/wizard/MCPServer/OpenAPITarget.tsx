// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpaceBetween } from '@cloudscape-design/components';
import { GATEWAY_TARGET_TYPES, GATEWAY_REST_API_OUTBOUND_AUTH_TYPES } from '@/utils/constants';
import { TargetConfiguration } from '../interfaces/Steps/MCPServerStep';
import SchemaUpload from './SchemaUpload';
import OutboundAuth from './OutboundAuth';

interface OpenAPITargetProps {
    target: TargetConfiguration;
    targetIndex: number;
    onTargetChange: (updates: Partial<TargetConfiguration>) => void;
    schemaError?: string;
    providerArnError?: string;
    setNumFieldsInError?: (callback: (prev: number) => number) => void;
}

export const OpenAPITarget = ({
    target,
    targetIndex,
    onTargetChange,
    schemaError,
    providerArnError,
    setNumFieldsInError
}: OpenAPITargetProps) => {
    const handleSchemaChange = (uploadedSchema: File | null, uploadedKey?: string) => {
        onTargetChange({ uploadedSchema, uploadedSchemaKey: uploadedKey });
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
            <SchemaUpload
                targetType={GATEWAY_TARGET_TYPES.OPEN_API}
                uploadedSchema={target.uploadedSchema}
                onSchemaChange={handleSchemaChange}
                targetIndex={targetIndex}
                errorText={schemaError}
            />

            {target.outboundAuth && (
                <OutboundAuth
                    outboundAuth={target.outboundAuth}
                    onAuthChange={handleAuthChange}
                    targetIndex={targetIndex}
                    excludeAuthTypes={[GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.NO_AUTH]}
                    providerArnError={providerArnError}
                    setNumFieldsInError={setNumFieldsInError}
                />
            )}
        </SpaceBetween>
    );
};

export default OpenAPITarget;
