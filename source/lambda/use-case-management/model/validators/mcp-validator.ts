// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import _ from 'lodash';
import { logger, tracer } from '../../power-tools-init';
import {
    GATEWAY_TARGET_TYPES,
    SCHEMA_TYPE_FILE_EXTENSIONS,
    McpOperationTypes,
    MCP_CONTENT_TYPES,
    SUPPORTED_MCP_FILE_EXTENSIONS,
    OUTBOUND_AUTH_PROVIDER_TYPES
} from '../../utils/constants';
import RequestValidationError from '../../utils/error';
import { McpOperation, FileUploadInfo } from '../adapters/mcp-adapter';
import { UseCaseValidator } from './base-validator';
import { UseCase } from '../use-case';
import { isValidArnWithRegexKey } from '../../utils/utils';
import { MCPUseCaseConfiguration, TargetParams } from '../types';

/**
 * Abstract base class for MCP operation validators.
 * This class provides a common interface for validating different types of MCP operations.
 *
 */
export abstract class McpOperationsValidator {
    /**
     * Validates an MCP operation.
     *
     * @param mcpOperation - The MCP operation to be validated
     * @returns A promise that resolves to the validated MCP operation
     */
    public abstract validateMcpOperation(mcpOperation: McpOperation): Promise<McpOperation>;

    /**
     * Factory method to create the appropriate validator based on the operation type.
     *
     * @param operationType - The type of MCP operation (e.g., McpOperationTypes.UPLOAD_SCHEMA)
     * @returns An instance of the appropriate McpOperationsValidator subclass
     * @throws Error if an invalid operation type is provided
     */
    static createValidator(operationType: string): McpOperationsValidator {
        if (operationType === McpOperationTypes.UPLOAD_SCHEMA) return new SchemaUploadValidator();

        const errorMsg = `Invalid MCP operation type: ${operationType}`;
        logger.error(`McpOperationsValidator factory creation failed: ${errorMsg}`);
        throw new Error(errorMsg);
    }
}

/**
 * Validator for schema upload MCP operations
 */
export class SchemaUploadValidator extends McpOperationsValidator {
    /**
     * Validates a schema upload MCP operation
     * - Validates schema type against allowed types
     * - Validates file extension matches schema type requirements
     *
     * @param mcpOperation - The MCP operation to validate
     * @returns Promise resolving to validated operation
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateSchemaUpload' })
    public async validateMcpOperation(mcpOperation: McpOperation): Promise<McpOperation> {
        const operation = mcpOperation as any; // Type assertion for accessing properties
        const processedFiles: FileUploadInfo[] = [];
        const errors: string[] = [];

        // Process and validate each raw file
        for (let i = 0; i < operation.rawFiles.length; i++) {
            const rawFile = operation.rawFiles[i];

            try {
                const processedFile = await this.validateRequiredFields(rawFile, i);

                // Validate the processed file
                await SchemaUploadValidator.validateSchemaType(processedFile, i);
                await SchemaUploadValidator.validateFileExtensionCompatibility(processedFile, i);
                await SchemaUploadValidator.setContentType(processedFile, i);

                processedFiles.push(processedFile);
            } catch (error) {
                if (error instanceof RequestValidationError) {
                    errors.push(error.message);
                } else {
                    errors.push(`files[${i}]: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        // If there are any errors, combine them and throw once
        if (errors.length > 0) {
            const combinedErrorMsg = errors.join('; ');
            logger.error(`SchemaUploadValidator validation failed with multiple errors: ${combinedErrorMsg}`);
            throw new RequestValidationError(combinedErrorMsg);
        }

        operation.files = processedFiles;
        logger.info(`Schema upload validation passed, fileCount: ${operation.files.length}`);

        return mcpOperation;
    }

    /**
     * Validates required fields and creates FileUploadInfo object from raw file data
     * @param rawFile - Raw file data from request
     * @param fileIndex - Index for error reporting
     * @returns FileUploadInfo object with validated required fields
     */
    private async validateRequiredFields(rawFile: any, fileIndex: number): Promise<FileUploadInfo> {
        if (!rawFile.schemaType || typeof rawFile.schemaType !== 'string' || rawFile.schemaType.trim() === '') {
            const errorMsg = `files[${fileIndex}].schemaType is required and must be a non-empty string`;
            logger.error(`SchemaUploadValidator validation failed: ${errorMsg}`);
            throw new RequestValidationError(errorMsg);
        }

        if (!rawFile.fileName || typeof rawFile.fileName !== 'string' || rawFile.fileName.trim() === '') {
            const errorMsg = `files[${fileIndex}].fileName is required and must be a non-empty string`;
            logger.error(`SchemaUploadValidator validation failed: ${errorMsg}`);
            throw new RequestValidationError(errorMsg);
        }

        const fileExtension = rawFile.fileName.toLowerCase().match(/\.[^.]+$/)?.[0] || '';

        if (!fileExtension) {
            const errorMsg = `files[${fileIndex}].fileName '${rawFile.fileName}' must have a valid file extension`;
            logger.error(`SchemaUploadValidator validation failed: ${errorMsg}`);
            throw new RequestValidationError(errorMsg);
        }

        return {
            schemaType: rawFile.schemaType,
            fileName: rawFile.fileName,
            fileExtension,
            contentType: '' // Will be set by setContentType validation method
        };
    }

    /**
     * Validates that the schema type is supported
     * @param file - The file object to validate
     * @param fileIndex - The index of the file for error reporting
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateSchemaType' })
    private static async validateSchemaType(file: any, fileIndex: number): Promise<void> {
        const validSchemaTypes = Object.values(GATEWAY_TARGET_TYPES);
        if (!validSchemaTypes.includes(file.schemaType as GATEWAY_TARGET_TYPES)) {
            const errorMsg = `Invalid files[${fileIndex}].schemaType '${file.schemaType}' for file '${file.fileName}'. Must be one of: ${validSchemaTypes.join(', ')}`;
            logger.error(`SchemaUploadValidator schema type validation failed: ${errorMsg}`);
            throw new RequestValidationError(errorMsg);
        }
    }

    /**
     * Validates that the file extension is compatible with the schema type (following TextUseCaseValidator pattern)
     * @param file - The file object to validate
     * @param fileIndex - The index of the file for error reporting
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateFileExtensionCompatibility' })
    private static async validateFileExtensionCompatibility(file: any, fileIndex: number): Promise<void> {
        const allowedExtensionsForSchema = SCHEMA_TYPE_FILE_EXTENSIONS[file.schemaType as GATEWAY_TARGET_TYPES];

        if (!allowedExtensionsForSchema || !allowedExtensionsForSchema.includes(file.fileExtension)) {
            const errorMsg = `Invalid files[${fileIndex}] file extension '${file.fileExtension}' for file '${file.fileName}' with schema type '${file.schemaType}'. Allowed extensions: ${allowedExtensionsForSchema?.join(', ') || 'none'}`;
            logger.error(`SchemaUploadValidator file extension compatibility validation failed: ${errorMsg}`);
            throw new RequestValidationError(errorMsg);
        }
    }

    /**
     * Sets the appropriate content type based on file extension
     * @param file - The file object to set content type for
     * @param fileIndex - The index of the file for error reporting
     * @throws RequestValidationError if extension is not supported
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###setContentType' })
    private static async setContentType(file: any, fileIndex: number): Promise<void> {
        switch (file.fileExtension.toLowerCase()) {
            case '.json':
                file.contentType = MCP_CONTENT_TYPES.JSON;
                break;
            case '.yaml':
            case '.yml':
                file.contentType = MCP_CONTENT_TYPES.YAML;
                break;
            case '.smithy':
                file.contentType = MCP_CONTENT_TYPES.TEXT_PLAIN;
                break;
            default:
                const errorMsg = `Unsupported file extension '${file.fileExtension}' for files[${fileIndex}] file '${file.fileName}'. Supported extensions: ${SUPPORTED_MCP_FILE_EXTENSIONS}`;
                logger.error(`SchemaUploadValidator content type determination failed: ${errorMsg}`);
                throw new RequestValidationError(errorMsg);
        }
    }
}

export class MCPUsecaseValidator extends UseCaseValidator<MCPUseCaseConfiguration> {
    /**
     * Validates a new MCP use case deployment. Will:
     * - Validate required MCP parameters are present
     * - Validate runtime parameters (EcrUri is required)
     * - Validate gateway parameters if provided
     * - Handle Cognito authentication configuration if present
     *
     * @param useCase - The MCP use case to validate
     * @returns validated use case with values filled in where needed
     * @throws if the config is invalid or cannot be validated for some reason
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateNewMCPUseCase' })
    public async validateNewUseCase(useCase: UseCase): Promise<UseCase> {
        // Validate MCP-specific parameters
        await MCPUsecaseValidator.validateMCPParams(useCase);
        return useCase;
    }

    /**
     * Validates an updated MCP use case. Will:
     * - Retrieve existing configuration from DynamoDB
     * - Merge existing config with new config
     * - Validate the merged configuration
     *
     * @param useCase - The MCP use case to validate
     * @param oldDynamoDbRecordKey - The key of the old DynamoDB record
     * @returns validated use case with values filled in where needed
     * @throws if the config is invalid or cannot be validated for some reason
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateUpdateMCPUseCase' })
    public async validateUpdateUseCase(useCase: UseCase, oldDynamoDbRecordKey: string): Promise<UseCase> {
        // retrieve the existing config from DynamoDB using a dummy use case object
        let dummyOldUseCase = useCase.clone();
        dummyOldUseCase.setUseCaseConfigRecordKey(oldDynamoDbRecordKey);
        const existingConfigObj = await this.useCaseConfigMgmt.getUseCaseConfigFromTable(dummyOldUseCase);

        // Custom merger that replaces arrays instead of merging them
        // This is critical for TargetParams - we want to replace the entire array, not merge elements
        const customizer = (_objValue: any, srcValue: any) => {
            if (Array.isArray(srcValue)) {
                return srcValue; // Replace arrays completely instead of merging
            }
            return undefined; // Let lodash handle the default merge behavior
        };

        // Merge existing config with new config using custom merger
        useCase.configuration = _.mergeWith({}, existingConfigObj, useCase.configuration, customizer);

        logger.info(`Updated MCP configuration with ${(useCase.configuration as any).MCPParams?.GatewayParams?.TargetParams?.length || 0} targets`);

        // Validate the merged configuration
        await MCPUsecaseValidator.validateMCPParams(useCase);

        return useCase;
    }

    /**
     * Validates MCP-specific parameters in the use case configuration
     *
     * @param useCase - The use case to validate
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateMCPParams' })
    private static async validateMCPParams(useCase: UseCase): Promise<void> {
        const mcpConfig = useCase.configuration as any; // Cast to access MCPParams

        if (!mcpConfig.MCPParams) {
            throw new RequestValidationError('MCPParams is required for MCP use cases');
        }

        const mcpParams = mcpConfig.MCPParams;
        // Validate that exactly one of GatewayParams or RuntimeParams is provided
        const hasGatewayParams = !!mcpParams.GatewayParams;
        const hasRuntimeParams = !!mcpParams.RuntimeParams;

        if (!hasGatewayParams && !hasRuntimeParams) {
            throw new RequestValidationError(
                'Either GatewayParams or RuntimeParams must be provided for MCP use cases'
            );
        }

        if (hasGatewayParams && hasRuntimeParams) {
            throw new RequestValidationError('Only one of GatewayParams or RuntimeParams should be provided, not both');
        }

        // If RuntimeParams is provided, validate EcrUri is required
        if (hasRuntimeParams) {
            if (
                !mcpParams.RuntimeParams.EcrUri ||
                typeof mcpParams.RuntimeParams.EcrUri !== 'string' ||
                mcpParams.RuntimeParams.EcrUri.trim() === ''
            ) {
                throw new RequestValidationError(
                    'ECR URI is required when deploying MCP servers with Agentcore Runtime'
                );
            }

            // Validate EcrUri region
            await MCPUsecaseValidator.validateEcrUri(mcpParams.RuntimeParams.EcrUri);

            // Validate environment variables if provided
            if (mcpParams.RuntimeParams.EnvironmentVariables !== undefined) {
                if (mcpParams.RuntimeParams.EnvironmentVariables === null) {
                    throw new RequestValidationError('Environment variables must be provided as an object');
                }
                MCPUsecaseValidator.validateEnvironmentVariables(mcpParams.RuntimeParams.EnvironmentVariables);
            }
        }

        // If GatewayParams is provided, validate it (existing validation logic)
        if (hasGatewayParams) {
            await MCPUsecaseValidator.validateGatewayParams(mcpParams.GatewayParams);
        }
    }

    /**
     * Validates gateway parameters if present
     *
     * @param gatewayParams - The gateway parameters to validate
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateGatewayParams' })
    private static async validateGatewayParams(gatewayParams: any): Promise<void> {
        // Validate optional gateway fields if present
        await MCPUsecaseValidator.validateOptionalGatewayFields(gatewayParams);

        // TargetParams is now required
        if (!gatewayParams.TargetParams) {
            throw new RequestValidationError('Target parameters are required when using Gateway deployment mode');
        }

        if (!Array.isArray(gatewayParams.TargetParams)) {
            throw new RequestValidationError('Target parameters must be provided as a list');
        }

        if (gatewayParams.TargetParams.length === 0) {
            throw new RequestValidationError('At least one target must be configured for Gateway deployment');
        }

        for (const target of gatewayParams.TargetParams) {
            await MCPUsecaseValidator.validateTargetRequiredFields(target);

            if (target.TargetType === GATEWAY_TARGET_TYPES.LAMBDA)
                await MCPUsecaseValidator.validateLambdaTarget(target);
            else if (target.TargetType === GATEWAY_TARGET_TYPES.OPEN_API)
                await MCPUsecaseValidator.validateOpenApiTarget(target);
        }
    }

    /**
     * Validates lambda target parameters
     *
     * @param target - The target parameters to validate
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateLambdaTarget' })
    private static async validateLambdaTarget(target: TargetParams): Promise<void> {
        if (typeof target.LambdaArn !== 'string' || target.LambdaArn.trim() === '') {
            throw new RequestValidationError(`Lambda ARN is missing for target "${target.TargetName}"`);
        }

        if (!isValidArnWithRegexKey(target.LambdaArn, 'lambda', 'lambda')) {
            throw new RequestValidationError(
                `Invalid Lambda ARN format for target "${target.TargetName}". Expected format: arn:aws:lambda:region:account:function:function-name`
            );
        }
    }

    /**
     * Validates OpenAPI target parameters
     *
     * @param target - The target parameters to validate
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateOpenApiTarget' })
    private static async validateOpenApiTarget(target: TargetParams): Promise<void> {
        if (!target.OutboundAuthParams) {
            throw new RequestValidationError(`Outbound authentication paramters are missing for the open api schema`);
        }
        await MCPUsecaseValidator.validateOutboundAuthParams(target.OutboundAuthParams, target.TargetName);
    }

    /**
     * Validates required target fields and schema URI format
     *
     * @param target - The target parameters to validate
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateTargetRequiredFields' })
    private static async validateTargetRequiredFields(target: TargetParams): Promise<void> {
        const { TargetName: targetName, TargetType: targetType, SchemaUri: schemaUri } = target;

        // Validate optional TargetId if present
        if (target.TargetId !== undefined) {
            await MCPUsecaseValidator.validateTargetId(target.TargetId, targetName);
        }

        if (!targetName || typeof targetName !== 'string' || targetName.trim() === '') {
            throw new RequestValidationError('Target name is required and cannot be empty');
        }

        if (/\s/.test(targetName)) {
            throw new RequestValidationError('Target name must not contain spaces');
        }

        // Validate TargetType is required and valid (reusing mcp-validator pattern)
        if (!targetType) {
            throw new RequestValidationError(`Target type is required for target "${targetName}"`);
        }

        const validTargetTypes = Object.values(GATEWAY_TARGET_TYPES);
        if (!validTargetTypes.includes(targetType as GATEWAY_TARGET_TYPES)) {
            throw new RequestValidationError(
                `Invalid target type for "${targetName}". Must be one of: ${validTargetTypes.join(', ')}`
            );
        }

        // SchemaUri is now required for ALL TargetTypes
        if (!schemaUri || typeof schemaUri !== 'string' || schemaUri.trim() === '') {
            throw new RequestValidationError(`Schema URI is missing for target "${targetName}"`);
        }

        const schemaUriPattern = /^mcp\/schemas\/([^\/]+)\/([a-f0-9-]{36})\.([^.]+)$/;
        const schemaUriMatch = schemaUri.match(schemaUriPattern);

        if (!schemaUriMatch) {
            throw new RequestValidationError(
                `Invalid schema URI format for target "${targetName}". Must follow pattern: mcp/schemas/{targetType}/{uuid}.{extension}`
            );
        }

        const [, schemaTargetType, , fileExtension] = schemaUriMatch;

        // Validate that schema URI target type matches declared target type
        if (schemaTargetType !== targetType) {
            throw new RequestValidationError(
                `Schema URI target type "${schemaTargetType}" does not match declared target type "${targetType}" for target "${targetName}"`
            );
        }

        const allowedExtensionsForSchema = SCHEMA_TYPE_FILE_EXTENSIONS[targetType];
        const normalizedExtension = `.${fileExtension.toLowerCase()}`;

        if (!allowedExtensionsForSchema || !allowedExtensionsForSchema.includes(normalizedExtension)) {
            throw new RequestValidationError(
                `Invalid file extension '.${fileExtension}' for target "${targetName}" with schema type '${targetType}'. Allowed extensions: ${allowedExtensionsForSchema?.join(', ') || 'none'
                }`
            );
        }
    }

    /**
     * Validates outbound authentication parameters
     *
     * @param authParams - The outbound auth parameters to validate
     * @param targetName - The name of the target for error reporting
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateOutboundAuthParams' })
    private static async validateOutboundAuthParams(authParams: any, targetName: string): Promise<void> {
        if (
            !authParams.OutboundAuthProviderArn ||
            typeof authParams.OutboundAuthProviderArn !== 'string' ||
            authParams.OutboundAuthProviderArn.trim() === ''
        ) {
            throw new RequestValidationError(
                `Outbound authentication provider ARN is required for target "${targetName}"`
            );
        }

        const isValidOAuth = isValidArnWithRegexKey(
            authParams.OutboundAuthProviderArn,
            'bedrock-agentcore',
            'bedrock-agentcore-identity-OAUTH'
        );
        const isValidApiKey = isValidArnWithRegexKey(
            authParams.OutboundAuthProviderArn,
            'bedrock-agentcore',
            'bedrock-agentcore-identity-API_KEY'
        );

        if (!isValidOAuth && !isValidApiKey) {
            throw new RequestValidationError(
                `Invalid outbound authentication provider ARN format for target "${targetName}"`
            );
        }

        if (!authParams.OutboundAuthProviderType) {
            throw new RequestValidationError(
                `Outbound authentication provider type is required for target "${targetName}"`
            );
        }

        const validAuthTypes = Object.values(OUTBOUND_AUTH_PROVIDER_TYPES);
        if (!validAuthTypes.includes(authParams.OutboundAuthProviderType)) {
            throw new RequestValidationError(
                `Invalid authentication type for target "${targetName}". Must be one of: ${validAuthTypes.join(', ')}`
            );
        }
    }

    /**
     * Validates optional gateway fields if present
     *
     * @param gatewayParams - The gateway parameters to validate
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateOptionalGatewayFields' })
    private static async validateOptionalGatewayFields(gatewayParams: any): Promise<void> {
        this.validateGatewayIdIfPresent(gatewayParams.GatewayId);
        this.validateGatewayArnIfPresent(gatewayParams.GatewayArn);
        this.validateGatewayUrlIfPresent(gatewayParams.GatewayUrl);
        this.validateGatewayNameIfPresent(gatewayParams.GatewayName);
    }

    private static validateGatewayIdIfPresent(gatewayId: any): void {
        if (gatewayId === undefined) return;

        if (typeof gatewayId !== 'string' || gatewayId.trim() === '') {
            throw new RequestValidationError('GatewayId must be a non-empty string');
        }
    }

    private static validateGatewayArnIfPresent(gatewayArn: any): void {
        if (gatewayArn === undefined) return;

        if (typeof gatewayArn !== 'string' || gatewayArn.trim() === '') {
            throw new RequestValidationError('GatewayArn must be a non-empty string');
        }

        if (!isValidArnWithRegexKey(gatewayArn, 'bedrock-agentcore', 'bedrock-agentcore-gateway')) {
            throw new RequestValidationError(
                'GatewayArn must follow pattern: arn:aws:bedrock-agentcore:{region}:{AccountId}:gateway/{GatewayId}'
            );
        }
    }

    private static validateGatewayUrlIfPresent(gatewayUrl: any): void {
        if (gatewayUrl === undefined) return;

        if (typeof gatewayUrl !== 'string' || gatewayUrl.trim() === '') {
            throw new RequestValidationError('GatewayUrl must be a non-empty string');
        }

        const gatewayUrlPattern =
            /^https:\/\/[a-zA-Z0-9-]+\.gateway\.bedrock-agentcore\.[a-z0-9-]+\.amazonaws\.com\/mcp$/;
        if (!gatewayUrlPattern.test(gatewayUrl)) {
            throw new RequestValidationError(
                'GatewayUrl must follow pattern: https://{GatewayId}.gateway.bedrock-agentcore.{Region}.amazonaws.com/mcp'
            );
        }
    }

    private static validateGatewayNameIfPresent(gatewayName: any): void {
        if (gatewayName === undefined) return;

        if (typeof gatewayName !== 'string' || gatewayName.trim() === '') {
            throw new RequestValidationError('GatewayName must be a non-empty string');
        }
    }

    /**
     * Validates TargetId if present
     *
     * @param targetId - The target ID to validate
     * @param targetName - The target name for error reporting
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateTargetId' })
    private static async validateTargetId(targetId: any, targetName: string): Promise<void> {
        if (typeof targetId !== 'string' || targetId.trim() === '') {
            throw new RequestValidationError(`TargetId must be a non-empty string for target "${targetName}"`);
        }

        const targetIdPattern = /^[A-Z0-9]{10}$/;
        if (!targetIdPattern.test(targetId)) {
            throw new RequestValidationError(
                `TargetId must be exactly 10 uppercase alphanumeric characters for target "${targetName}"`
            );
        }

        if (targetId.length !== 10) {
            throw new RequestValidationError(`TargetId must be exactly 10 characters long for target "${targetName}"`);
        }
    }

    /**
     * Validates ECR URI region matches the deployment region
     *
     * @param ecrUri - The ECR URI to validate
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateEcrUri' })
    private static async validateEcrUri(ecrUri: string): Promise<void> {
        const ecrRegion = ecrUri.match(/\.dkr\.ecr\.([a-z\d-]+)\.amazonaws\.com\//)![1];
        const currentRegion = process.env.AWS_REGION;

        // Validate region matches deployment region
        if (currentRegion && ecrRegion !== currentRegion) {
            throw new RequestValidationError(
                `ECR image must be in the same region (${currentRegion}) as the deployment.`
            );
        }
    }

    /**
     * Validates environment variables for runtime parameters
     *
     * @param environmentVariables - The environment variables object to validate
     * @throws RequestValidationError if validation fails
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateEnvironmentVariables' })
    private static validateEnvironmentVariables(environmentVariables: { [key: string]: string }): void {
        const envVarEntries = Object.entries(environmentVariables);

        // Check maximum number of environment variables (AWS Lambda limit is 4KB total, we'll limit to 50 variables)
        if (envVarEntries.length > 50) {
            throw new RequestValidationError('Maximum of 50 environment variables are allowed');
        }

        // Validate each environment variable
        for (const [key, value] of envVarEntries) {
            // Validate environment variable name
            if (typeof key !== 'string' || key.trim() === '') {
                throw new RequestValidationError('Environment variable names cannot be empty');
            }

            // Environment variable names must follow AWS naming conventions
            const envVarNamePattern = /^[a-zA-Z_]\w*$/;
            if (!envVarNamePattern.test(key)) {
                throw new RequestValidationError(
                    `Invalid environment variable name "${key}". Names must start with a letter or underscore and contain only letters, numbers, and underscores`
                );
            }

            // Check name length (AWS limit is 256 characters)
            if (key.length > 256) {
                throw new RequestValidationError(
                    `Environment variable name "${key}" exceeds maximum length of 256 characters`
                );
            }

            // Validate environment variable value
            if (typeof value !== 'string') {
                throw new RequestValidationError(`Environment variable value for "${key}" must be a string`);
            }

            // Check value length (AWS limit is 4KB per variable, we'll be more conservative)
            if (value.length > 2048) {
                throw new RequestValidationError(
                    `Environment variable value for "${key}" exceeds maximum length of 2048 characters`
                );
            }
        }

        // Calculate total size of environment variables (approximate)
        const totalSize = envVarEntries.reduce((sum, [key, value]) => sum + key.length + value.length, 0);
        if (totalSize > 4096) {
            // 4KB limit
            throw new RequestValidationError(
                'Total size of environment variables exceeds 4KB limit. Please reduce the number or size of environment variables'
            );
        }
    }
}
