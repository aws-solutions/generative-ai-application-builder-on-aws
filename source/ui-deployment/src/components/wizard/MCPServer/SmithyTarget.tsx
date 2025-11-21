// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GATEWAY_TARGET_TYPES } from '@/utils/constants';
import { TargetConfiguration } from '../interfaces/Steps/MCPServerStep';
import SchemaUpload from './SchemaUpload';

interface SmithyTargetProps {
    target: TargetConfiguration;
    targetIndex: number;
    onTargetChange: (updates: Partial<TargetConfiguration>) => void;
    schemaError?: string;
}

export const SmithyTarget = ({ target, targetIndex, onTargetChange, schemaError }: SmithyTargetProps) => {
    const handleSchemaChange = (uploadedSchema: File | null, uploadedKey?: string) => {
        onTargetChange({ uploadedSchema, uploadedSchemaKey: uploadedKey });
    };

    return (
        <SchemaUpload
            targetType={GATEWAY_TARGET_TYPES.SMITHY}
            uploadedSchema={target.uploadedSchema}
            onSchemaChange={handleSchemaChange}
            targetIndex={targetIndex}
            errorText={schemaError}
        />
    );
};

export default SmithyTarget;
