// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { logger, tracer } from '../../power-tools-init';
import { UploadMCPTargetSchemaAdapter, McpOperation } from '../adapters/mcp-adapter';
import { CaseCommand } from './case-command';
import { UseCase } from '../use-case';
import { ListUseCasesAdapter, UseCaseRecord } from '../list-use-cases';
import { GetUseCaseAdapter } from '../get-use-case';
import { McpOperationsValidator } from '../validators/mcp-validator';
import { S3Management } from '../../s3/s3-management';
import { McpOperationTypes, UseCaseTypes, STRANDS_TOOLS_SSM_PARAM_ENV_VAR } from '../../utils/constants';
import { StackManagement } from '../../cfn/stack-management';
import { StorageManagement } from '../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../ddb/use-case-config-management';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { AWSClientManager } from 'aws-sdk-lib';

/**
 * Interface for Strands SDK tools
 */
export interface StrandsTool {
    name: string;
    description: string;
    value: string;
    category?: string;
    isDefault: boolean;
}

/**
 * Response interface for ListMCPServersCommand
 */
export interface ListMCPServersResponse {
    mcpServers: Array<{
        useCaseId: string;
        useCaseName: string;
        description: string;
        status: 'ACTIVE' | 'INACTIVE';
        url: string;
        type: 'gateway' | 'runtime';
    }>;
    strandsTools: StrandsTool[];
}

/**
 * Abstract base class for MCP management commands
 */
export abstract class McpMgmtCommand implements CaseCommand {
    protected s3Mgmt: S3Management;
    protected validator: McpOperationsValidator;

    constructor() {
        this.s3Mgmt = new S3Management();
    }

    /**
     * Initializes the MCP validator based on the operation type.
     * This method should be called before using validateMcpOperation.
     *
     * @param operationType - The type of MCP operation (e.g., McpOperationTypes.UPLOAD_SCHEMA)
     */
    protected initializeValidator(operationType: string): void {
        this.validator = McpOperationsValidator.createValidator(operationType);
    }

    /**
     * Validates an MCP operation using the initialized validator.
     *
     * @param mcpOperation - The MCP operation to be validated
     * @returns A promise that resolves to the validated MCP operation
     * @throws Error if the validator has not been initialized
     */
    protected async validateMcpOperation(mcpOperation: McpOperation): Promise<McpOperation> {
        if (!this.validator) {
            const errorMsg = 'MCP Validator not initialized. Call initializeValidator first.';
            logger.error(`McpMgmtCommand validation failed: ${errorMsg}`);
            throw new Error(errorMsg);
        }
        return this.validator.validateMcpOperation(mcpOperation);
    }

    /**
     * Execute method that supports MCP operations
     * @param operation - McpOperation
     */
    abstract execute(operation: McpOperation): Promise<any>;
}

/**
 * Command to handle schema upload operations for MCP servers
 */
export class UploadSchemasCommand extends McpMgmtCommand {
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###uploadSchemasCommand' })
    public async execute(operation: UseCase | ListUseCasesAdapter | GetUseCaseAdapter | McpOperation): Promise<any> {
        // Handle MCP operations specifically
        if (!(operation instanceof UploadMCPTargetSchemaAdapter)) {
            const errorMsg = 'UploadSchemasCommand only supports UploadMCPTargetSchemaAdapter operations';
            logger.error(
                `UploadSchemasCommand operation type validation failed: ${errorMsg}, received: ${
                    operation?.constructor?.name || 'unknown'
                }`
            );
            throw new Error(errorMsg);
        }

        // Initialize and use validator (similar to UseCaseMgmtCommand pattern)
        this.initializeValidator(McpOperationTypes.UPLOAD_SCHEMA);
        await this.validateMcpOperation(operation);

        logger.info(`Creating presigned POSTs for validated schema uploads - fileCount: ${operation.files.length}`);

        try {
            const response = await this.s3Mgmt.createSchemaUploadPresignedPosts(operation.userId, operation.files);

            logger.info(`Successfully created ${response.uploads.length} presigned POSTs for schema uploads`);

            return response;
        } catch (error) {
            logger.error(`Failed to create presigned POSTs for schema uploads, error: ${(error as Error).message}`);
            throw error;
        }
    }
}

/**
 * Command to list all MCP servers
 */
export class ListMCPServersCommand implements CaseCommand {
    stackMgmt: StackManagement;
    storageMgmt: StorageManagement;
    useCaseConfigMgmt: UseCaseConfigManagement;
    ssmClient: SSMClient;

    constructor() {
        this.stackMgmt = new StackManagement();
        this.storageMgmt = new StorageManagement();
        this.useCaseConfigMgmt = new UseCaseConfigManagement();
        this.ssmClient = AWSClientManager.getServiceClient<SSMClient>('ssm', tracer);
    }

    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###listMCPServersCommand' })
    public async execute(
        operation: UseCase | ListUseCasesAdapter | GetUseCaseAdapter | McpOperation
    ): Promise<ListMCPServersResponse> {
        logger.debug('Enter ListMCPServersCommand');

        const useCaseRecords = await this.fetchUseCaseRecords();
        const mcpServers = await this.processMcpServerRecords(useCaseRecords);
        
        logger.info(`Found ${mcpServers.length} MCP servers`);
        if (mcpServers.length === 0) {
            logger.debug('No MCP servers found, returning empty array');
        }

        const strandsTools = await this.getStrandsTools();

        return {
            mcpServers,
            strandsTools
        };
    }

    private async fetchUseCaseRecords(): Promise<UseCaseRecord[]> {
        const listAdapter = new ListUseCasesAdapter({
            queryStringParameters: { pageNumber: '1' }
        } as any);

        try {
            const response = await this.storageMgmt.getAllCaseRecords(listAdapter);
            return response.useCaseRecords;
        } catch (error) {
            logger.error(`Error while listing use case records in DDB, Error: ${error}`);
            throw error;
        }
    }

    private async processMcpServerRecords(useCaseRecords: UseCaseRecord[]): Promise<Array<{
        useCaseId: string;
        useCaseName: string;
        description: string;
        status: 'ACTIVE' | 'INACTIVE';
        url: string;
        type: 'gateway' | 'runtime';
    }>> {
        const mcpServers = [];

        for (const record of useCaseRecords) {
            const server = await this.processSingleRecord(record);
            if (server) {
                mcpServers.push(server);
            }
        }

        return mcpServers;
    }

    private async processSingleRecord(record: UseCaseRecord) {
        if (!record.UseCaseConfigRecordKey) {
            logger.error(`UseCaseConfigRecordKey missing for record: ${record.UseCaseId}`);
            return null;
        }

        try {
            const config = await this.useCaseConfigMgmt.getUseCaseConfigFromRecord(record);
            
            if (config.UseCaseType !== UseCaseTypes.MCP_SERVER) {
                return null;
            }

            return await this.buildMcpServerEntry(record, config);
        } catch (error) {
            logger.warn(`Error retrieving config for record ${record.UseCaseId}, excluding from results: ${error}`);
            return null;
        }
    }

    private async buildMcpServerEntry(record: UseCaseRecord, config: any) {
        const stackStatus = await this.getStackStatus(record);
        
        try {
            const { type, url } = this.extractMcpServerDetails(config, record.UseCaseId);
            const description = this.extractDescription(config, record.UseCaseId);

            return {
                useCaseId: record.UseCaseId,
                useCaseName: config.UseCaseName || '',
                description,
                status: this.determineStatus(stackStatus),
                url,
                type
            };
        } catch (error) {
            logger.error(`Error extracting MCP server details for ${record.UseCaseId}: ${error}`);
            return null;
        }
    }

    /**
     * Extracts description from use case configuration
     *
     * @param config - Use case configuration object
     * @param useCaseId - Use case ID for logging
     * @returns Description string (empty string if not available)
     */
    private extractDescription(config: any, useCaseId: string): string {
        if (config.UseCaseDescription && typeof config.UseCaseDescription === 'string') {
            const description = config.UseCaseDescription.trim();
            if (description) {
                logger.debug(`Using UseCaseDescription for MCP server ${useCaseId}`);
                return description;
            }
        }

        if (config.UseCaseDescription && typeof config.UseCaseDescription !== 'string') {
            logger.error(
                `Invalid UseCaseDescription type for MCP server ${useCaseId}: expected string, got ${typeof config.UseCaseDescription}`
            );
        }

        logger.warn(`No valid description available for MCP server ${useCaseId}`);
        return '';
    }

    private async getStackStatus(record: UseCaseRecord): Promise<string> {
        try {
            const stackDetails = await this.stackMgmt.getStackDetailsFromUseCaseRecord(record);
            return stackDetails.status || 'UNKNOWN';
        } catch (error) {
            logger.warn(`Could not retrieve stack status for ${record.UseCaseId}: ${error}`);
            return 'UNKNOWN';
        }
    }

    /**
     * Fetches Strands tools configuration from SSM Parameter Store
     *
     * @returns Promise resolving to array of StrandsTool objects, or empty array on error
     */
    private async getStrandsTools(): Promise<StrandsTool[]> {
        const paramName = process.env[STRANDS_TOOLS_SSM_PARAM_ENV_VAR];

        if (!paramName) {
            logger.warn(`${STRANDS_TOOLS_SSM_PARAM_ENV_VAR} environment variable not set, returning empty tools array`);
            return [];
        }

        try {
            logger.debug(`Fetching Strands tools from SSM parameter: ${paramName}`);

            const command = new GetParameterCommand({ Name: paramName });
            const response = await this.ssmClient.send(command);

            if (!response.Parameter?.Value) {
                logger.warn(`SSM parameter ${paramName} has no value, returning empty tools array`);
                return [];
            }

            // Parse JSON and validate structure
            const tools = JSON.parse(response.Parameter.Value) as StrandsTool[];

            if (!Array.isArray(tools)) {
                logger.error(`SSM parameter ${paramName} value is not an array, returning empty tools array`);
                return [];
            }

            logger.info(`Successfully loaded ${tools.length} Strands tools from SSM parameter ${paramName}`);
            return tools;
        } catch (error: any) {
            if (error.name === 'ParameterNotFound') {
                logger.warn(`SSM parameter ${paramName} not found, returning empty tools array`);
            } else if (error.name === 'AccessDeniedException') {
                logger.error(`Insufficient IAM permissions to read SSM parameter ${paramName}: ${error.message}`);
            } else if (error instanceof SyntaxError) {
                // Truncate value for logging to avoid excessive log size
                const truncatedValue = error.message.substring(0, 200);
                logger.error(`Invalid JSON in SSM parameter ${paramName}. Parse error: ${truncatedValue}...`);
            } else {
                logger.error(`Unexpected error reading SSM parameter ${paramName}: ${error.message || error}`);
            }
            return [];
        }
    }

    /**
     * Extracts MCP server type and URL from configuration
     *
     * @param config - Use case configuration object
     * @param useCaseId - Use case ID for logging
     * @returns Object containing type ('gateway' | 'runtime') and url (string)
     * @throws Error if configuration is invalid (both or neither params present)
     */
    private extractMcpServerDetails(config: any, useCaseId: string): { type: 'gateway' | 'runtime'; url: string } {
        const mcpParams = this.validateMcpParams(config, useCaseId);
        this.validateMcpParamsStructure(mcpParams, useCaseId);

        if (mcpParams.GatewayParams) {
            return this.extractGatewayDetails(mcpParams.GatewayParams, useCaseId);
        }

        return this.extractRuntimeDetails(mcpParams.RuntimeParams, useCaseId);
    }

    private validateMcpParams(config: any, useCaseId: string): any {
        if (!config.MCPParams) {
            throw new Error(`MCPParams not found in configuration for use case ${useCaseId}`);
        }
        return config.MCPParams;
    }

    private validateMcpParamsStructure(mcpParams: any, useCaseId: string): void {
        const hasGateway = mcpParams.GatewayParams;
        const hasRuntime = mcpParams.RuntimeParams;

        if (hasGateway && hasRuntime) {
            logger.error(
                `Invalid MCP configuration: both GatewayParams and RuntimeParams present for use case ${useCaseId}`
            );
            throw new Error('Invalid MCP configuration: both GatewayParams and RuntimeParams present');
        }

        if (!hasGateway && !hasRuntime) {
            logger.error(
                `Invalid MCP configuration: neither GatewayParams nor RuntimeParams present for use case ${useCaseId}`
            );
            throw new Error('Invalid MCP configuration: neither GatewayParams nor RuntimeParams present');
        }
    }

    private extractGatewayDetails(gatewayParams: any, useCaseId: string): { type: 'gateway'; url: string } {
        const gatewayUrl = gatewayParams.GatewayUrl || '';

        if (!gatewayUrl) {
            logger.warn(`GatewayUrl missing for use case ${useCaseId}`);
        }

        return {
            type: 'gateway',
            url: gatewayUrl
        };
    }

    private extractRuntimeDetails(runtimeParams: any, useCaseId: string): { type: 'runtime'; url: string } {
        const runtimeUrl = this.getRuntimeUrl(runtimeParams, useCaseId);

        if (!runtimeUrl) {
            logger.warn(`RuntimeUrl missing for use case ${useCaseId}`);
        }

        return {
            type: 'runtime',
            url: runtimeUrl
        };
    }

    private getRuntimeUrl(runtimeParams: any, useCaseId: string): string {
        if (runtimeParams.RuntimeUrl) {
            return runtimeParams.RuntimeUrl;
        }

        if (runtimeParams.RuntimeArn) {
            return this.constructRuntimeUrlFromArn(runtimeParams.RuntimeArn, useCaseId);
        }

        return '';
    }

    private constructRuntimeUrlFromArn(runtimeArn: string, useCaseId: string): string {
        try {
            const encodedArn = encodeURIComponent(runtimeArn);
            const region = process.env.AWS_REGION;
            const url = `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=DEFAULT`;
            logger.debug(`Constructed RuntimeUrl from RuntimeArn for use case ${useCaseId}`);
            return url;
        } catch (error) {
            logger.warn(`Failed to construct RuntimeUrl from RuntimeArn for use case ${useCaseId}: ${error}`);
            return '';
        }
    }

    /**
     * Determines the MCP server status based on CloudFormation stack status
     *
     * @param stackStatus - CloudFormation stack status
     * @returns 'ACTIVE' or 'INACTIVE'
     */
    private determineStatus(stackStatus: string): 'ACTIVE' | 'INACTIVE' {
        // Active if stack creation is complete
        if (stackStatus === 'CREATE_COMPLETE' || stackStatus === 'UPDATE_COMPLETE') {
            return 'ACTIVE';
        }

        // All other states (CREATE_IN_PROGRESS, ROLLBACK, etc.) are inactive
        return 'INACTIVE';
    }
}
