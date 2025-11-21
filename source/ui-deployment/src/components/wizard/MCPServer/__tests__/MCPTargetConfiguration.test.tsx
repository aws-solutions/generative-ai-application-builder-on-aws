// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import MCPTargetConfiguration from '../MCPTargetConfiguration';
import { TargetConfiguration } from '../../interfaces/Steps/MCPServerStep';
import { GATEWAY_TARGET_TYPES, GATEWAY_REST_API_OUTBOUND_AUTH_TYPES } from '@/utils/constants';

describe('MCPTargetConfiguration', () => {
    const mockTarget: TargetConfiguration = {
        id: '1',
        targetName: 'Test Target',
        targetDescription: 'Test Description',
        targetType: GATEWAY_TARGET_TYPES.LAMBDA,
        uploadedSchema: null,
        lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
        outboundAuth: {
            authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
            providerArn:
                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-provider'
        }
    };

    const mockProps = {
        target: mockTarget,
        index: 0,
        onUpdateTarget: vi.fn(),
        onRemoveTarget: vi.fn(),
        canRemove: true,
        setNumFieldsInError: vi.fn()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders target configuration component', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        expect(screen.getByText('Target Configuration 1')).toBeInTheDocument();
        expect(screen.getByTestId('target-name-field-1')).toBeInTheDocument();
        expect(screen.getByTestId('target-description-field-1')).toBeInTheDocument();
    });

    test('displays target name and description fields', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');
        const descriptionTextarea = cloudscapeWrapper.findTextarea('[data-testid="target-description-textarea-1"]');

        expect(nameInput?.getInputValue()).toBe('Test Target');
        expect(descriptionTextarea?.getTextareaValue()).toBe('Test Description');
    });

    test('handles target name change', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');
        nameInput?.setInputValue('New Target Name');

        expect(mockProps.onUpdateTarget).toHaveBeenCalledWith('1', { targetName: 'New Target Name' });
    });

    test('handles target description change', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const descriptionTextarea = cloudscapeWrapper.findTextarea('[data-testid="target-description-textarea-1"]');
        descriptionTextarea?.setTextareaValue('New Description');

        expect(mockProps.onUpdateTarget).toHaveBeenCalledWith('1', { targetDescription: 'New Description' });
    });

    test('displays target type radio buttons', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="target-type-radio-1"]');
        expect(radioGroup).toBeDefined();

        expect(radioGroup?.findInputByValue(GATEWAY_TARGET_TYPES.LAMBDA)).toBeTruthy();
        expect(radioGroup?.findInputByValue(GATEWAY_TARGET_TYPES.OPEN_API)).toBeTruthy();
        expect(radioGroup?.findInputByValue(GATEWAY_TARGET_TYPES.SMITHY)).toBeTruthy();
    });

    test('handles target type change', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="target-type-radio-1"]');
        radioGroup?.findInputByValue(GATEWAY_TARGET_TYPES.OPEN_API)?.click();

        expect(mockProps.onUpdateTarget).toHaveBeenCalledWith('1', {
            targetType: GATEWAY_TARGET_TYPES.OPEN_API,
            uploadedSchema: null,
            uploadedSchemaKey: undefined,
            uploadedSchemaFileName: undefined,
            uploadFailed: false
        });
    });

    test('clears uploaded schema when target type changes', () => {
        // Create a target with an uploaded schema
        const targetWithSchema: TargetConfiguration = {
            ...mockTarget,
            uploadedSchema: new File(['test content'], 'test.smithy', { type: 'text/plain' }),
            uploadedSchemaKey: 'mcp/schemas/smithy/test-key.smithy',
            uploadedSchemaFileName: 'test.smithy'
        };

        const propsWithSchema = {
            ...mockProps,
            target: targetWithSchema
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...propsWithSchema} />);

        // Change target type from Lambda to OpenAPI
        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="target-type-radio-1"]');
        radioGroup?.findInputByValue(GATEWAY_TARGET_TYPES.OPEN_API)?.click();

        // Verify that the schema is cleared when target type changes
        expect(mockProps.onUpdateTarget).toHaveBeenCalledWith('1', {
            targetType: GATEWAY_TARGET_TYPES.OPEN_API,
            uploadedSchema: null,
            uploadedSchemaKey: undefined,
            uploadedSchemaFileName: undefined,
            uploadFailed: false
        });
    });

    test('shows Lambda ARN field for lambda target type', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        expect(screen.getByTestId('lambda-arn-field-1')).toBeInTheDocument();

        const lambdaArnInput = cloudscapeWrapper.findInput('[data-testid="lambda-arn-input-1"]');
        expect(lambdaArnInput?.getInputValue()).toBe('arn:aws:lambda:us-east-1:123456789012:function:test-function');
    });

    test('handles Lambda ARN change', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const lambdaArnInput = cloudscapeWrapper.findInput('[data-testid="lambda-arn-input-1"]');
        lambdaArnInput?.setInputValue('arn:aws:lambda:us-east-1:123456789012:function:new-function');

        expect(mockProps.onUpdateTarget).toHaveBeenCalledWith('1', {
            lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:new-function'
        });
    });

    test('shows file upload for schema', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        expect(screen.getByTestId('file-upload-field-1')).toBeInTheDocument();
        expect(screen.getByTestId('file-upload-1')).toBeInTheDocument();
    });

    test('shows authentication section for OpenAPI target type', () => {
        const openApiProps = {
            ...mockProps,
            target: {
                ...mockTarget,
                targetType: GATEWAY_TARGET_TYPES.OPEN_API
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...openApiProps} />);

        expect(screen.getByText('Outbound Authentication')).toBeInTheDocument();

        const authRadioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="auth-type-radio-1"]');
        expect(authRadioGroup).toBeDefined();
        expect(authRadioGroup?.findInputByValue(GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH)).toBeTruthy();
        expect(authRadioGroup?.findInputByValue(GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY)).toBeTruthy();
    });

    test('shows provider ARN field for API key authentication', () => {
        const apiKeyProps = {
            ...mockProps,
            target: {
                ...mockTarget,
                targetType: GATEWAY_TARGET_TYPES.OPEN_API,
                outboundAuth: {
                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
                    providerArn:
                        'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key-provider'
                }
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...apiKeyProps} />);

        expect(screen.getByTestId('provider-arn-field-1')).toBeInTheDocument();

        const providerArnInput = cloudscapeWrapper.findInput('[data-testid="provider-arn-input-1"]');
        expect(providerArnInput?.getInputValue()).toBe(
            'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key-provider'
        );
    });

    test('shows provider ARN field for OAuth authentication', () => {
        const oauthProps = {
            ...mockProps,
            target: {
                ...mockTarget,
                targetType: GATEWAY_TARGET_TYPES.OPEN_API,
                outboundAuth: {
                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                    providerArn:
                        'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth-provider'
                }
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...oauthProps} />);

        expect(screen.getByTestId('provider-arn-field-1')).toBeInTheDocument();

        const providerArnInput = cloudscapeWrapper.findInput('[data-testid="provider-arn-input-1"]');
        expect(providerArnInput?.getInputValue()).toBe(
            'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth-provider'
        );
    });

    test('shows remove button when canRemove is true', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const removeButton = cloudscapeWrapper.findButton('[data-testid="remove-target-1"]');
        expect(removeButton).toBeDefined();
    });

    test('hides remove button when canRemove is false', () => {
        const noRemoveProps = {
            ...mockProps,
            canRemove: false
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...noRemoveProps} />);

        const removeButton = cloudscapeWrapper.findButton('[data-testid="remove-target-1"]');
        expect(removeButton).toBeNull();
    });

    test('handles remove target action', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const removeButton = cloudscapeWrapper.findButton('[data-testid="remove-target-1"]');
        removeButton?.click();

        expect(mockProps.onRemoveTarget).toHaveBeenCalledWith('1');
    });

    test('validates required fields and shows errors', () => {
        const emptyProps = {
            ...mockProps,
            target: {
                ...mockTarget,
                targetName: '',
                targetDescription: ''
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...emptyProps} />);

        // Trigger validation by changing and clearing fields
        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');
        nameInput?.setInputValue('test');
        nameInput?.setInputValue('');

        expect(mockProps.setNumFieldsInError).toHaveBeenCalled();
    });

    test('displays proper target type labels in descriptions', () => {
        // Test Lambda target type shows "Lambda" label
        const lambdaProps = {
            ...mockProps,
            target: { ...mockTarget, targetType: GATEWAY_TARGET_TYPES.LAMBDA }
        };
        const { rerender } = cloudscapeRender(<MCPTargetConfiguration {...lambdaProps} />);
        expect(
            screen.getByText('Upload your Lambda schema file. Lambda function schema (JSON format).')
        ).toBeInTheDocument();

        // Test OpenAPI target type shows "OpenAPI" label
        const openApiProps = {
            ...mockProps,
            target: { ...mockTarget, targetType: GATEWAY_TARGET_TYPES.OPEN_API }
        };
        rerender(<MCPTargetConfiguration {...openApiProps} />);
        expect(
            screen.getByText('Upload your OpenAPI schema file. OpenAPI specification (JSON or YAML format).')
        ).toBeInTheDocument();

        // Test Smithy target type shows "Smithy" label
        const smithyProps = {
            ...mockProps,
            target: { ...mockTarget, targetType: GATEWAY_TARGET_TYPES.SMITHY }
        };
        rerender(<MCPTargetConfiguration {...smithyProps} />);
        expect(
            screen.getByText('Upload your Smithy schema file. Smithy model definition (.smithy or JSON format).')
        ).toBeInTheDocument();
    });

    test('shows validation error for invalid Lambda ARN and turns input field red', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const lambdaArnInput = cloudscapeWrapper.findInput('[data-testid="lambda-arn-input-1"]');

        // Test completely invalid ARN format (missing parts)
        lambdaArnInput?.setInputValue('arn:aws:lambda:us-east-1:invalid-account:function:test-function');

        // Check that error message appears
        expect(
            screen.getByText(
                'Invalid Lambda ARN format. Please enter a valid ARN like: arn:aws:lambda:region:account-id:function:function-name'
            )
        ).toBeInTheDocument();

        // Check that the FormField has error state (which makes input red)
        const formField = cloudscapeWrapper.findFormField('[data-testid="lambda-arn-field-1"]');
        expect(formField?.findError()).toBeTruthy();

        // Verify setNumFieldsInError was called to track the error
        expect(mockProps.setNumFieldsInError).toHaveBeenCalled();
    });

    test('shows validation error for completely malformed Lambda ARN', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const lambdaArnInput = cloudscapeWrapper.findInput('[data-testid="lambda-arn-input-1"]');

        // Test completely invalid ARN
        lambdaArnInput?.setInputValue('not-an-arn-at-all');

        // Check that error message appears
        expect(screen.getByText(/Invalid Lambda ARN format/)).toBeInTheDocument();

        // Check that the FormField has error state
        const formField = cloudscapeWrapper.findFormField('[data-testid="lambda-arn-field-1"]');
        expect(formField?.findError()).toBeTruthy();
    });

    test('shows validation error for Lambda ARN with invalid account ID', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const lambdaArnInput = cloudscapeWrapper.findInput('[data-testid="lambda-arn-input-1"]');

        // Test invalid account ID (not 12 digits)
        lambdaArnInput?.setInputValue('arn:aws:lambda:us-east-1:12345:function:test-function');

        // Check that error message appears
        expect(screen.getByText(/Invalid Lambda ARN format/)).toBeInTheDocument();

        // Check that the FormField has error state
        const formField = cloudscapeWrapper.findFormField('[data-testid="lambda-arn-field-1"]');
        expect(formField?.findError()).toBeTruthy();
    });

    test('clears validation error when valid Lambda ARN is entered', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const lambdaArnInput = cloudscapeWrapper.findInput('[data-testid="lambda-arn-input-1"]');

        // First enter invalid ARN
        lambdaArnInput?.setInputValue('invalid-arn');
        expect(screen.getByText(/Invalid Lambda ARN format/)).toBeInTheDocument();

        // Then enter valid ARN
        lambdaArnInput?.setInputValue('arn:aws:lambda:us-east-1:123456789012:function:valid-function');

        // Check that error message is cleared
        expect(screen.queryByText(/Invalid Lambda ARN format/)).not.toBeInTheDocument();

        // Check that the FormField no longer has error state
        const formField = cloudscapeWrapper.findFormField('[data-testid="lambda-arn-field-1"]');
        expect(formField?.findError()).toBeFalsy();
    });

    test('shows duplicate name error when target name already exists in allTargets', () => {
        const allTargets: TargetConfiguration[] = [
            {
                ...mockTarget,
                id: '1',
                targetName: 'existing-target'
            },
            {
                ...mockTarget,
                id: '2',
                targetName: 'another-target'
            }
        ];

        const propsWithAllTargets = {
            ...mockProps,
            target: { ...mockTarget, id: '3', targetName: '' },
            allTargets
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...propsWithAllTargets} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');

        nameInput?.setInputValue('existing-target');

        expect(
            screen.getByText("A target with name 'existing-target' already exists in this gateway.")
        ).toBeInTheDocument();

        const formField = cloudscapeWrapper.findFormField('[data-testid="target-name-field-1"]');
        expect(formField?.findError()).toBeTruthy();
    });

    test('shows duplicate name error case-insensitively', () => {
        const allTargets: TargetConfiguration[] = [
            {
                ...mockTarget,
                id: '1',
                targetName: 'existing-target'
            }
        ];

        const propsWithAllTargets = {
            ...mockProps,
            target: { ...mockTarget, id: '2', targetName: '' },
            allTargets
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...propsWithAllTargets} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');

        nameInput?.setInputValue('EXISTING-TARGET');

        expect(
            screen.getByText("A target with name 'EXISTING-TARGET' already exists in this gateway.")
        ).toBeInTheDocument();
    });

    test('does not show duplicate error for the same target', () => {
        const allTargets: TargetConfiguration[] = [
            {
                ...mockTarget,
                id: '1',
                targetName: 'my-target'
            },
            {
                ...mockTarget,
                id: '2',
                targetName: 'another-target'
            }
        ];

        const propsWithAllTargets = {
            ...mockProps,
            target: { ...mockTarget, id: '1', targetName: 'my-target' },
            allTargets
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...propsWithAllTargets} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');

        nameInput?.setInputValue('my-target');

        expect(screen.queryByText(/already exists in this gateway/)).not.toBeInTheDocument();
    });

    test('shows duplicate error only when actively typing', () => {
        const allTargets: TargetConfiguration[] = [
            {
                ...mockTarget,
                id: '1',
                targetName: 'existing-name'
            }
        ];

        const propsWithAllTargets = {
            ...mockProps,
            target: { ...mockTarget, id: '2', targetName: '' },
            allTargets
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...propsWithAllTargets} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');

        // Type a duplicate name - error should appear
        nameInput?.setInputValue('existing-name');
        expect(
            screen.getByText("A target with name 'existing-name' already exists in this gateway.")
        ).toBeInTheDocument();

        // Type a unique name - error should clear
        nameInput?.setInputValue('unique-name');
        expect(screen.queryByText(/already exists in this gateway/)).not.toBeInTheDocument();
    });

    test('shows validation error when target name contains spaces', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');

        // Test name with spaces
        nameInput?.setInputValue('target with spaces');
        expect(screen.getByText(/Target name cannot contain spaces/)).toBeInTheDocument();
    });

    test('shows validation error for target name with leading space', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');

        nameInput?.setInputValue(' target-name');
        expect(screen.getByText(/Target name cannot contain spaces/)).toBeInTheDocument();
    });

    test('shows validation error for target name with trailing space', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');

        nameInput?.setInputValue('target-name ');
        expect(screen.getByText(/Target name cannot contain spaces/)).toBeInTheDocument();
    });

    test('shows validation error for target name with spaces before other validations', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPTargetConfiguration {...mockProps} />);

        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');

        // Test that space error appears even with special characters
        nameInput?.setInputValue('target name!@#');
        expect(screen.getByText(/Target name cannot contain spaces/)).toBeInTheDocument();
    });
});
