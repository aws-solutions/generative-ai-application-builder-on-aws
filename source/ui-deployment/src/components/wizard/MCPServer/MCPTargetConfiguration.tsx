// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Container, Header, SpaceBetween, Button, Box, StatusIndicator } from '@cloudscape-design/components';
import { TargetConfiguration } from '../interfaces/Steps/MCPServerStep';
import { GATEWAY_TARGET_TYPES, DEPLOYMENT_ACTIONS } from '@/utils/constants';

// Import the new modular components
import TargetBasicInfo from './TargetBasicInfo';
import TargetTypeSelector from './TargetTypeSelector';
import LambdaTarget from './LambdaTarget';
import OpenAPITarget from './OpenAPITarget';
import SmithyTarget from './SmithyTarget';

// Utility function for upload status indicator
const renderUploadStatus = (target: TargetConfiguration, successText = 'Uploaded') => {
    if (target.uploadFailed) {
        return (
            <Box display="inline" margin={{ left: 's' }}>
                <StatusIndicator type="error">Upload failed</StatusIndicator>
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

interface MCPTargetConfigurationProps {
    target: TargetConfiguration;
    index: number;
    onUpdateTarget: (targetId: string, updates: Partial<TargetConfiguration>) => void;
    onRemoveTarget: (targetId: string) => void;
    canRemove: boolean;
    setNumFieldsInError: (callback: (prev: number) => number) => void;
    setHelpPanelContent?: (content: any) => void;
    allTargets?: TargetConfiguration[];
    deploymentAction?: string;
    originalTargetIds?: string[];
}

export const MCPTargetConfiguration = (props: MCPTargetConfigurationProps) => {
    const {
        target,
        index,
        onUpdateTarget,
        onRemoveTarget,
        canRemove,
        allTargets = [],
        deploymentAction,
        originalTargetIds = []
    } = props;

    const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

    // Determine if target name should be disabled (existing targets in edit mode)
    const isTargetNameDisabled = deploymentAction === DEPLOYMENT_ACTIONS.EDIT && originalTargetIds.includes(target.id);

    const handleTargetChange = (updates: Partial<TargetConfiguration>) => {
        // Clear previous upload when user selects a new file
        if (updates.uploadedSchema !== undefined) {
            updates.uploadedSchemaKey = undefined;
            updates.uploadedSchemaFileName = undefined;
            updates.uploadFailed = false; // Clear failure flag
        }
        onUpdateTarget(target.id, updates);
    };

    const handleTargetTypeChange = (targetType: GATEWAY_TARGET_TYPES) => {
        // Clear type-specific errors when changing target type
        const clearedErrors = { ...fieldErrors };
        delete clearedErrors.lambdaArn;
        delete clearedErrors.providerArn;
        setFieldErrors(clearedErrors);

        // Clear uploaded schema when target type changes since file types may not be compatible
        handleTargetChange({
            targetType,
            uploadedSchema: null,
            uploadedSchemaKey: undefined,
            uploadedSchemaFileName: undefined,
            uploadFailed: false
        });
    };

    const renderTargetSpecificComponent = () => {
        switch (target.targetType) {
            case GATEWAY_TARGET_TYPES.LAMBDA:
                return (
                    <LambdaTarget
                        target={target}
                        targetIndex={index}
                        onTargetChange={handleTargetChange}
                        lambdaArnError={fieldErrors.lambdaArn}
                        schemaError={fieldErrors.schema}
                        setNumFieldsInError={props.setNumFieldsInError}
                    />
                );
            case GATEWAY_TARGET_TYPES.OPEN_API:
                return (
                    <OpenAPITarget
                        target={target}
                        targetIndex={index}
                        onTargetChange={handleTargetChange}
                        schemaError={fieldErrors.schema}
                        providerArnError={fieldErrors.providerArn}
                        setNumFieldsInError={props.setNumFieldsInError}
                    />
                );
            case GATEWAY_TARGET_TYPES.SMITHY:
                return (
                    <SmithyTarget
                        target={target}
                        targetIndex={index}
                        onTargetChange={handleTargetChange}
                        schemaError={fieldErrors.schema}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Container
            header={
                <Header
                    variant="h3"
                    actions={
                        canRemove ? (
                            <Button
                                variant="link"
                                onClick={() => onRemoveTarget(target.id)}
                                data-testid={`remove-target-${target.id}`}
                            >
                                Remove Target
                            </Button>
                        ) : undefined
                    }
                >
                    Target Configuration {index + 1}
                    {renderUploadStatus(target)}
                </Header>
            }
        >
            <SpaceBetween size="l">
                <TargetBasicInfo
                    target={target}
                    targetIndex={index}
                    onTargetChange={handleTargetChange}
                    nameError={fieldErrors.targetName}
                    setNumFieldsInError={props.setNumFieldsInError}
                    allTargets={allTargets}
                    isTargetNameDisabled={isTargetNameDisabled}
                />

                <TargetTypeSelector
                    selectedType={target.targetType}
                    onTypeChange={handleTargetTypeChange}
                    targetIndex={index}
                />

                {renderTargetSpecificComponent()}
            </SpaceBetween>
        </Container>
    );
};

export default MCPTargetConfiguration;
