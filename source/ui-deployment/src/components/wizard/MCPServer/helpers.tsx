// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween } from '@cloudscape-design/components';
import {
    IG_DOCS,
    MCP_CREATION_METHOD_OPTIONS,
    MCP_TARGET_TYPE_OPTIONS,
    MCP_AUTH_TYPE_OPTIONS,
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    ARN_RESOURCE_REGEX_MAP,
    ECR_URI_PATTERN
} from '@/utils/constants';
import { parse, validate } from '@aws-sdk/util-arn-parser';

export const mcpServerInfoPanel = {
    creationMethod: {
        title: 'MCP Server Creation Method',
        content: (
            <div>
                <Box variant="p">Choose how you want to create or host your Model Context Protocol (MCP) server:</Box>
                <SpaceBetween size="s">
                    <Box variant="p">
                        <strong>{MCP_CREATION_METHOD_OPTIONS.get(MCP_SERVER_CREATION_METHOD.GATEWAY)?.label}:</strong>{' '}
                        Generate an MCP server from existing Lambda functions or API specifications using Amazon Bedrock
                        AgentCore Gateway. This method automatically converts your APIs into MCP tools.
                    </Box>
                    <Box variant="p">
                        <strong>{MCP_CREATION_METHOD_OPTIONS.get(MCP_SERVER_CREATION_METHOD.RUNTIME)?.label}:</strong>{' '}
                        Deploy an existing MCP server from a Docker image stored in Amazon ECR using Amazon Bedrock
                        AgentCore Runtime. Use this if you already have a containerized MCP server.
                    </Box>
                </SpaceBetween>
            </div>
        ),
        links: [
            {
                href: IG_DOCS.AGENTCORE_GATEWAY,
                text: 'Building a Gateway with Amazon Bedrock AgentCore'
            },
            {
                href: IG_DOCS.AGENTCORE_RUNTIME_MCP,
                text: 'Using MCP with Amazon Bedrock AgentCore Runtime'
            }
        ]
    },

    targetType: {
        title: 'Target Type',
        content: (
            <div>
                <Box variant="p">
                    Select the type of target you want to convert into MCP tools using Amazon Bedrock AgentCore Gateway:
                </Box>
                <SpaceBetween size="s">
                    <Box variant="p">
                        <strong>{MCP_TARGET_TYPE_OPTIONS.get(GATEWAY_TARGET_TYPES.LAMBDA)?.label}:</strong> Convert AWS
                        Lambda functions into MCP tools. Requires the Lambda function ARN and schema definition.
                    </Box>
                    <Box variant="p">
                        <strong>{MCP_TARGET_TYPE_OPTIONS.get(GATEWAY_TARGET_TYPES.OPEN_API)?.label}:</strong> Convert
                        REST APIs defined by OpenAPI specifications into MCP tools. Supports authentication methods.
                    </Box>
                    <Box variant="p">
                        <strong>{MCP_TARGET_TYPE_OPTIONS.get(GATEWAY_TARGET_TYPES.SMITHY)?.label}:</strong> Convert
                        services defined by Smithy models into MCP tools. Uses Smithy schema definitions.
                    </Box>
                </SpaceBetween>
            </div>
        ),
        links: [
            {
                href: IG_DOCS.AGENTCORE_GATEWAY_TARGETS,
                text: 'Adding targets to your Gateway'
            },
            {
                href: IG_DOCS.AWS_LAMBDA,
                text: 'AWS Lambda Documentation'
            }
        ]
    },

    lambdaArn: {
        title: 'Lambda Function ARN',
        content: (
            <div>
                <Box variant="p">
                    Enter the Amazon Resource Name (ARN) of the Lambda function you want to convert into MCP tools.
                </Box>
                <Box variant="p">The ARN format is: arn:aws:lambda:region:account-id:function:function-name</Box>
                <Box variant="p">
                    You can find the ARN in the AWS Lambda console under your function's configuration details.
                </Box>
            </div>
        ),
        links: [
            {
                href: IG_DOCS.AWS_LAMBDA_ARN,
                text: 'Lambda ARN Documentation'
            }
        ]
    },

    outboundAuth: {
        title: 'Outbound Authentication',
        content: (
            <div>
                <Box variant="p">Configure authentication for outbound API calls when using OpenAPI targets:</Box>
                <SpaceBetween size="s">
                    <Box variant="p">
                        <strong>{MCP_AUTH_TYPE_OPTIONS.get(GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH)?.label}:</strong>{' '}
                        Use OAuth 2.0 authentication with client credentials. Requires Client ID and Client Secret.
                    </Box>
                    <Box variant="p">
                        <strong>
                            {MCP_AUTH_TYPE_OPTIONS.get(GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY)?.label}:
                        </strong>{' '}
                        Use API key authentication. The key will be included in API requests as specified by the OpenAPI
                        definition.
                    </Box>
                </SpaceBetween>
            </div>
        ),
        links: [
            {
                href: IG_DOCS.AGENTCORE_GATEWAY_TARGETS,
                text: 'Adding targets to your Gateway'
            }
        ]
    },

    ecrImageUri: {
        title: 'ECR Image URI',
        content: (
            <div>
                <Box variant="p">
                    Enter the complete URI of your Docker image stored in Amazon Elastic Container Registry (ECR) that
                    contains your MCP server.
                </Box>
                <Box variant="p">
                    The URI format is: account-id.dkr.ecr.region.amazonaws.com/repository-name:tag
                </Box>
                <Box variant="p">The ECR image must be in the same AWS region as your deployment.</Box>
                <Box variant="p">
                    Make sure the image contains a properly configured MCP server that can handle the Model Context
                    Protocol and is compatible with Amazon Bedrock AgentCore Runtime.
                </Box>
            </div>
        ),
        links: [
            {
                href: IG_DOCS.AGENTCORE_RUNTIME_MCP,
                text: 'Using MCP with Amazon Bedrock AgentCore Runtime'
            },
            {
                href: IG_DOCS.AWS_ECR,
                text: 'Amazon ECR Documentation'
            }
        ]
    }
};

/**
 * Validates if a given string is a valid Amazon ECR image URI.
 *
 * @param uri - The ECR image URI string to validate
 * @param expectedRegion - Optional AWS region to validate against (e.g., 'us-east-1')
 * @returns true if the URI is valid, false otherwise
 */
export const isEcrUriValid = (uri: string, expectedRegion?: string): boolean => {
    if (!uri || uri.length === 0) {
        return false;
    }

    // ECR URI format: account-id.dkr.ecr.region.amazonaws.com/repository-name:tag
    const ecrUriRegex = new RegExp(ECR_URI_PATTERN);

    const match = ecrUriRegex.exec(uri);
    if (!match) {
        return false;
    }

    // If expectedRegion is provided, validate that the URI region matches
    if (expectedRegion) {
        const uriRegion = match[2];
        if (uriRegion !== expectedRegion) {
            return false;
        }
    }

    return true;
};

const is12DigitAccount = (x?: string) => typeof x === 'string' && /^\d{12}$/.test(x);

const hasRegion = (x?: string) => typeof x === 'string' && x.length > 0;

/**
 * Validates if a given string is a valid ARN with a specific regex key for resource validation.
 * This allows using different regex patterns for the same service.
 *
 * @param arn - The ARN string to validate
 * @param service - The AWS service name (e.g., 'bedrock-agentcore')
 * @param regexKey - The key to look up the regex pattern in ARN_RESOURCE_REGEX_MAP
 * @returns true if the ARN is valid, false otherwise
 */
export function isValidArnWithRegexKey(arn: string, service: string, regexKey: string): boolean {
    if (!validate(arn)) return false;

    let parsed;
    try {
        parsed = parse(arn);
    } catch {
        return false;
    }

    // Validate Arn base on Service
    if (parsed.service !== service) return false;
    // Validate Arn has region and account Id values
    if (!hasRegion(parsed.region) || !is12DigitAccount(parsed.accountId)) return false;

    const resourceRe = ARN_RESOURCE_REGEX_MAP[regexKey];
    if (!resourceRe) return false; // unknown regex key
    return resourceRe.test(parsed.resource);
}

/**
 * Generic validation function for optional string fields with maximum length constraints.
 *
 * @param value - The string value to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of the field for error messages
 * @returns error message if invalid, empty string if valid
 */
export const validateOptionalStringField = (value: string, maxLength: number, fieldName: string): string => {
    if (!value || value.trim().length === 0) {
        return '';
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length > maxLength) {
        return `${fieldName} exceeds maximum length of ${maxLength} characters. Current length: ${trimmedValue.length}.`;
    }

    return '';
};

/**
 * Common key validator for environment variables and similar identifiers.
 *
 * @param key - The key to validate
 * @returns error message if invalid, empty string if valid
 */
export const validateKey = (key: string): string => {
    if (!key || key.trim().length === 0) return '';
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        return 'Key must start with a letter or underscore and contain only letters, numbers, and underscores';
    }
    return '';
};

/**
 * Common value validator that allows any string value.
 *
 * @param value - The value to validate
 * @returns error message if invalid, empty string if valid
 */
export const validateValue = (value: string): string => {
    // Values can be empty or any string
    return '';
};

/**
 * Common key-value pair validator with completeness validation.
 * Uses the common key and value validators.
 *
 * @param param - The parameter object with key and value properties
 * @returns Object with keyError and valueError strings
 */
export const validateKeyValuePair = (
    param: { key: string; value: string },
    keyValidator: (key: string) => string = validateKey,
    valueValidator: (value: string) => string = validateValue
): { keyError: string; valueError: string } => {
    let keyError = keyValidator(param.key);
    let valueError = valueValidator(param.value);

    // Key-value pair completeness validation - both key and value are required
    const hasKey = param.key && param.key.trim() !== '';
    const hasValue = param.value && param.value.trim() !== '';

    if (hasKey && !hasValue) {
        valueError = valueError || 'Value is required when key is provided';
    } else if (hasValue && !hasKey) {
        keyError = keyError || 'Key is required when value is provided';
    }

    return { keyError, valueError };
};
