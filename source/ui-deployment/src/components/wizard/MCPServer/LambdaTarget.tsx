// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FormField, Input, SpaceBetween, InputProps } from '@cloudscape-design/components';
import { GATEWAY_TARGET_TYPES } from '@/utils/constants';
import { TargetConfiguration } from '../interfaces/Steps/MCPServerStep';
import SchemaUpload from './SchemaUpload';
import { isValidArnWithRegexKey } from './helpers';
import { updateNumFieldsInError } from '../utils';

interface LambdaTargetProps {
    target: TargetConfiguration;
    targetIndex: number;
    onTargetChange: (updates: Partial<TargetConfiguration>) => void;
    lambdaArnError?: string;
    schemaError?: string;
    setNumFieldsInError?: (callback: (prev: number) => number) => void;
}

export const LambdaTarget = ({
    target,
    targetIndex,
    onTargetChange,
    lambdaArnError,
    schemaError,
    setNumFieldsInError
}: LambdaTargetProps) => {
    const [currentArnError, setCurrentArnError] = React.useState(lambdaArnError || '');

    const handleLambdaArnChange = (detail: InputProps.ChangeDetail) => {
        const lambdaArn = detail.value;
        onTargetChange({ lambdaArn });
        
        let errors = '';
        if (lambdaArn.length === 0) {
            errors += 'Required field. ';
        } else if (!isValidArnWithRegexKey(lambdaArn, 'lambda', 'lambda')) {
            errors += 'Invalid Lambda ARN format. Please enter a valid ARN like: arn:aws:lambda:region:account-id:function:function-name';
        }

        if (setNumFieldsInError) {
            updateNumFieldsInError(errors, currentArnError, setNumFieldsInError);
        }
        setCurrentArnError(errors);
    };

    const handleSchemaChange = (uploadedSchema: File | null, uploadedKey?: string) => {
        onTargetChange({ uploadedSchema, uploadedSchemaKey: uploadedKey });
    };

    return (
        <SpaceBetween size="l">
            <FormField
                label={
                    <span>
                        Lambda Function ARN - <i>required</i>
                    </span>
                }
                description="Enter the ARN of the Lambda function to integrate"
                errorText={currentArnError}
                data-testid={`lambda-arn-field-${targetIndex + 1}`}
            >
                <Input
                    value={target.lambdaArn || ''}
                    onChange={({ detail }) => handleLambdaArnChange(detail)}
                    placeholder="arn:aws:lambda:region:account-id:function:function-name"
                    data-testid={`lambda-arn-input-${targetIndex + 1}`}
                />
            </FormField>

            <SchemaUpload
                targetType={GATEWAY_TARGET_TYPES.LAMBDA}
                uploadedSchema={target.uploadedSchema}
                onSchemaChange={handleSchemaChange}
                targetIndex={targetIndex}
                errorText={schemaError}
            />
        </SpaceBetween>
    );
};

export default LambdaTarget;
