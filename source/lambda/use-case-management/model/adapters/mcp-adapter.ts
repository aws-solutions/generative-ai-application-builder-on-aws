// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import RequestValidationError from '../../utils/error';
import { logger } from '../../power-tools-init';
import { generateUUID, parseEventBody, extractUserId } from '../../utils/utils';
import {
    McpOperationTypes,
    UseCaseTypes,
    CfnParameterKeys,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR
} from '../../utils/constants';
import { UseCase } from '../use-case';
import { MCPUseCaseConfiguration } from '../types';
import { GetUseCaseAdapter } from '../get-use-case';

/**
 * Base interface for MCP operations
 */
export interface McpOperation {
    // Interface intentionally minimal
    // As other adapters are implemented, this interface can be used like UseCase to pull out common fields
}

/**
 * Interface for file upload information
 */
export interface FileUploadInfo {
    schemaType: string;
    fileName: string;
    fileExtension: string;
    contentType: string;
}

/**
 * Adapter for upload-schemas MCP operation that validates all inputs and supports multiple files
 */
export class UploadMCPTargetSchemaAdapter implements McpOperation {
    public readonly rawFiles: any[];
    public readonly userId: string;
    public files: FileUploadInfo[] = [];

    constructor(event: APIGatewayEvent) {
        const eventBody = parseEventBody(event);

        if (!eventBody.files || !Array.isArray(eventBody.files) || eventBody.files.length === 0) {
            logger.error("'files' is a required field and must be a non-empty array");
            throw new RequestValidationError("'files' is a required field and must be a non-empty array");
        }

        this.userId = extractUserId(event);
        this.rawFiles = eventBody.files;
    }
}

/**
 * Adapter for MCP use case operations
 */
export class MCPUseCaseAdapter extends UseCase {
    public readonly deploymentData: any;
    public readonly userId: string;

    constructor(event: APIGatewayEvent) {
        const jsonBody = parseEventBody(event);
        const useCaseId: string = event.pathParameters?.useCaseId ?? generateUUID();
        const cfnParameters = MCPUseCaseAdapter.createCfnParameters(jsonBody, useCaseId);
        const config = MCPUseCaseAdapter.createConfiguration(jsonBody);
        const userId = event.requestContext.authorizer!.UserId;

        super(
            useCaseId,
            jsonBody?.UseCaseName,
            jsonBody?.UseCaseDescription,
            cfnParameters,
            config,
            userId,
            undefined,
            UseCaseTypes.MCP_SERVER
        );

        // Platform SaaS: capture owning tenant (admin deploys "on behalf of" a customer)
        this.tenantId =
            jsonBody?.TenantId ?? jsonBody?.tenantId ?? (event.requestContext.authorizer as any)?.TenantId ?? undefined;
    }

    /**
     * Override template name generation for Agent Builder use cases.
     * MCP Server use cases use a fixed template name regardless of provider.
     *
     * @param providerName The provider name (ignored for MCP Server Stack)
     * @param useCaseType The use case type (ignored for MCP Server Stack)
     * @returns Fixed template name 'MCPServerStack'
     */
    protected generateTemplateName(providerName: string | undefined, useCaseType: string): string {
        return 'MCPServerStack';
    }

    /**
     * Override parameter retention for MCP use cases.
     * MCP Server use cases don't need VPC or other parameters to be retained during updates.
     *
     * @returns Empty array - no parameters should be retained for MCP updates
     */
    public getRetainedParameterKeys(): string[] {
        return [];
    }

    private static createCfnParameters(eventBody: any, useCaseId: string): Map<string, string> {
        const cfnParameters = new Map<string, string>();
        const shortUUID = this.generateShortUUID(useCaseId);
        const recordKeySuffixUUID = this.generateShortUUID(generateUUID());
        const agentClientId = eventBody.AgentClientId;
        cfnParameters.set(CfnParameterKeys.UseCaseUUID, `${useCaseId}`);

        cfnParameters.set(CfnParameterKeys.UseCaseConfigTableName, process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]!);
        cfnParameters.set(
            CfnParameterKeys.UseCaseConfigRecordKey,
            UseCase.generateUseCaseConfigRecordKey(shortUUID, recordKeySuffixUUID)
        );

        cfnParameters.set(CfnParameterKeys.ExistingRestApiId, eventBody.ExistingRestApiId);

        if (process.env[GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR]) {
            const s3BucketName = process.env[GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR];
            cfnParameters.set(CfnParameterKeys.S3BucketName, s3BucketName);
        }

        cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolId, process.env[USER_POOL_ID_ENV_VAR]!);

        if (eventBody.MCPParams?.RuntimeParams?.EcrUri)
            this.setParameterIfExists(
                cfnParameters,
                CfnParameterKeys.EcrUri,
                eventBody.MCPParams?.RuntimeParams?.EcrUri
            );

        if (agentClientId) cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolClient, agentClientId);

        return cfnParameters;
    }
    private static createConfiguration(eventBody: any): MCPUseCaseConfiguration {
        return {
            UseCaseType: eventBody.UseCaseType,
            UseCaseName: eventBody.UseCaseName,
            UseCaseDescription: eventBody.UseCaseDescription,
            MCPParams: eventBody.MCPParams
        };
    }
}

/**
 * Adapter for listing MCP servers
 */
export class ListMCPAdapter implements McpOperation {
    public readonly event: APIGatewayEvent;

    constructor(event: APIGatewayEvent) {
        this.event = event;
    }
}

/**
 * Factory function to create appropriate MCP adapter based on operation type
 */
export class McpAdapterFactory {
    public static createAdapter(event: APIGatewayEvent, operation: string): McpOperation | UseCase {
        switch (operation) {
            case McpOperationTypes.UPLOAD_SCHEMA:
                return new UploadMCPTargetSchemaAdapter(event);
            case McpOperationTypes.CREATE:
            case McpOperationTypes.UPDATE:
                return new MCPUseCaseAdapter(event);
            case McpOperationTypes.DELETE:
            case McpOperationTypes.PERMANENTLY_DELETE:
                return new MCPInfoAdapter(event);
            case McpOperationTypes.GET:
                return new GetUseCaseAdapter(event);
            case McpOperationTypes.LIST:
                return new ListMCPAdapter(event);
            default:
                const errorMsg = `Unsupported MCP operation: ${operation}`;
                logger.error(`McpAdapterFactory creation failed: ${errorMsg}`);
                throw new Error(errorMsg);
        }
    }
}

/**
 * Adapter implementation for @UseCase to extract information from Lambda event objects
 * and convert them to @UseCase type.
 *
 * Used for operations which require only the use case ID and user, such as deletion,
 * permanent deletion, and getting info on a single use case
 */
export class MCPInfoAdapter extends UseCase {
    constructor(event: APIGatewayEvent) {
        const useCaseId: string = event.pathParameters!.useCaseId!;
        const userId = event.requestContext.authorizer!.UserId;

        super(useCaseId, '', undefined, undefined, {}, userId, '', UseCaseTypes.MCP_SERVER);
    }
}
