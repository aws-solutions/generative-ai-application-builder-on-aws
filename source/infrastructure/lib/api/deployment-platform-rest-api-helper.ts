#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as api from 'aws-cdk-lib/aws-apigateway';
import { JsonSchema } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

/**
 * Context object containing common parameters for API operations
 * Reduces parameter duplication across helper methods
 */
export interface DeploymentApiContext {
    scope: Construct;
    requestValidator: api.RequestValidator;
    authorizer: api.IAuthorizer;
    integration: api.LambdaIntegration;
}

/**
 * Use case deployment schema structure for CRUD operations
 * Matches the DeploymentSchemas structure from model-schema/index.ts
 */
export interface DeploymentSchema {
    deploy?: JsonSchema;
    deployResponse?: JsonSchema;
    update?: JsonSchema;
    updateResponse?: JsonSchema;
}

/**
 * Configuration for ignoring specific CRUD operations
 */
export interface CrudModelIgnore {
    /** Skip GET /collection endpoint */
    collectionGet?: boolean;
    /** Skip POST /collection endpoint */
    collectionPost?: boolean;
    /** Skip GET /collection/{id} endpoint */
    itemGet?: boolean;
    /** Skip PATCH /collection/{id} endpoint */
    itemPatch?: boolean;
    /** Skip DELETE /collection/{id} endpoint */
    itemDelete?: boolean;
}

/**
 * Static helper class for creating deployment REST API resources and methods
 * Provides reusable methods for building REST API endpoints with consistent patterns
 */
export class DeploymentRestApiHelper {
    /**
     * Configures CORS for a resource with standard headers
     * @param resource The API Gateway resource
     * @param allowedMethods Array of HTTP methods to allow
     */
    static configureCors(resource: api.Resource, allowedMethods: string[]): void {
        if (!resource || resource.node.tryFindChild('OPTIONS')) {
            return;
        }

        resource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'],
            allowMethods: allowedMethods
        });
    }

    /**
     * Creates consistent method options for API Gateway methods
     * @param context The deployment API context
     * @param operationName The operation name for the method
     * @param additionalParams Additional request parameters to include
     * @returns Configured method options
     */
    private static createMethodOptions(
        context: DeploymentApiContext,
        operationName: string,
        additionalParams?: Record<string, any>
    ): api.MethodOptions {
        return {
            operationName,
            authorizer: context.authorizer,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestValidator: context.requestValidator,
            requestParameters: {
                // API Gateway request parameters are case-sensitive; require the standard Authorization header.
                'method.request.header.Authorization': true,
                ...additionalParams
            }
        };
    }

    /**
     * Creates method options with request/response models for CRUD operations
     * @param context The deployment API context
     * @param operationName The operation name for the method
     * @param requestModel Optional request model for validation
     * @param responseModel Optional response model for documentation
     * @param additionalParams Additional request parameters to include
     * @returns Configured method options with models
     */
    static createMethodOptionsWithModels(
        context: DeploymentApiContext,
        operationName: string,
        requestModel?: api.IModel,
        responseModel?: api.IModel,
        additionalParams?: Record<string, any>
    ): any {
        const options: any = {
            ...DeploymentRestApiHelper.createMethodOptions(context, operationName, additionalParams)
        };

        if (requestModel) {
            options.requestModels = { 'application/json': requestModel };
        }

        if (responseModel) {
            options.methodResponses = [
                {
                    responseModels: { 'application/json': responseModel },
                    statusCode: '200'
                }
            ];
        }

        return options;
    }

    /**
     * Creates an API Gateway model with consistent naming and structure
     * @param context The deployment API context
     * @param restApi The REST API to create the model for
     * @param modelName The name of the model (e.g., 'DeployUseCaseApiBody')
     * @param description Description of what the model represents
     * @param schema The JSON schema for the model
     * @returns The created API Gateway model
     */
    static createModel(
        context: DeploymentApiContext,
        restApi: api.IRestApi,
        modelName: string,
        description: string,
        schema: JsonSchema
    ): api.Model {
        const fullModelName = `${modelName}Model`;
        return new api.Model(context.scope, fullModelName, {
            restApi: restApi,
            contentType: 'application/json',
            description: description,
            modelName: fullModelName,
            schema: schema
        });
    }

    /**
     * Creates the basic resource structure and CORS
     * @param parentResource Parent resource to add to
     * @param collectionPath Path for the collection resource (e.g., 'mcp')
     * @param singularName Singular name for path parameters (e.g., 'mcp' for {mcp-id})
     * @returns Object with collection and item resources
     */
    static createResourceStructure(
        parentResource: api.Resource,
        collectionPath: string,
        singularName: string
    ): { collectionResource: api.Resource; itemResource: api.Resource } {
        const collectionResource = parentResource.addResource(collectionPath);
        const itemResource = collectionResource.addResource(`{${singularName}}`);

        // Configure CORS
        DeploymentRestApiHelper.configureCors(collectionResource, ['GET', 'POST', 'OPTIONS']);
        DeploymentRestApiHelper.configureCors(itemResource, ['GET', 'PATCH', 'DELETE', 'POST', 'OPTIONS']);

        return { collectionResource, itemResource };
    }

    /**
     * Creates models for CRUD operations with consistent naming
     * @param context The deployment API context
     * @param restApi The REST API to create models for
     * @param operationPrefix Operation prefix (e.g., 'UseCase', 'MCP')
     * @param deploymentSchema Use case deployment schema for request/response schemas
     * @returns Object with created models
     */
    static createCrudModels(
        context: DeploymentApiContext,
        restApi: api.IRestApi,
        operationPrefix: string,
        deploymentSchema?: DeploymentSchema
    ): any {
        if (!deploymentSchema) return {};

        const entityName = operationPrefix.toLowerCase();
        const models: any = {};

        if (deploymentSchema.deploy) {
            const modelName = `Deploy${operationPrefix}ApiBody`;
            const description = `Defines the required JSON structure of the POST request to deploy a ${entityName}`;
            models.createRequestModel = DeploymentRestApiHelper.createModel(
                context,
                restApi,
                modelName,
                description,
                deploymentSchema.deploy
            );
        }

        if (deploymentSchema.deployResponse) {
            const modelName = `Deploy${operationPrefix}Response`;
            const description = `Response model to describe response of deploying a ${entityName}`;
            models.createResponseModel = DeploymentRestApiHelper.createModel(
                context,
                restApi,
                modelName,
                description,
                deploymentSchema.deployResponse
            );
        }

        if (deploymentSchema.update) {
            const modelName = `Update${operationPrefix}ApiBody`;
            const description = `Defines the required JSON structure of the PUT request to update a ${entityName}`;
            models.updateRequestModel = DeploymentRestApiHelper.createModel(
                context,
                restApi,
                modelName,
                description,
                deploymentSchema.update
            );
        }

        if (deploymentSchema.updateResponse) {
            const modelName = `Update${operationPrefix}Response`;
            const description = `Response model to describe response of updating a ${entityName}`;
            models.updateResponseModel = DeploymentRestApiHelper.createModel(
                context,
                restApi,
                modelName,
                description,
                deploymentSchema.updateResponse
            );
        }

        return models;
    }

    /**
     * Creates all CRUD operations with consistent naming and behavior
     * @param context The deployment API context
     * @param collectionResource Collection resource (e.g., /deployments)
     * @param itemResource Item resource (e.g., /deployments/{id})
     * @param operationPrefix Prefix for operation names (e.g., 'UseCase', 'MCP')
     * @param restApi Optional REST API for auto-creating models from schemas
     * @param ignore Optional configuration to skip specific CRUD operations
     * @param deploymentSchema Optional use case deployment schema for auto-creating models
     * @returns Array of resources created for suppression purposes
     */
    static addCrudOperations(
        context: DeploymentApiContext,
        collectionResource: api.Resource,
        itemResource: api.Resource,
        operationPrefix: string,
        restApi?: api.IRestApi,
        deploymentSchema?: DeploymentSchema
    ): api.Resource[] {
        // create models if deploymentSchema provided
        const models =
            restApi && deploymentSchema
                ? DeploymentRestApiHelper.createCrudModels(context, restApi, operationPrefix, deploymentSchema)
                : {};

        // GET /collection params
        const getParams = {
            'method.request.querystring.pageNumber': true,
            'method.request.querystring.searchFilter': false
        };
        collectionResource.addMethod(
            'GET',
            context.integration,
            DeploymentRestApiHelper.createMethodOptions(context, `Get${operationPrefix}s`, getParams)
        );

        // POST /collection - Deploy item (consistent naming)
        const baseOptions = DeploymentRestApiHelper.createMethodOptions(context, `Deploy${operationPrefix}`);
        const createMethodOptions: any = { ...baseOptions };

        // Add request model if available
        if (models && models.createRequestModel) {
            createMethodOptions.requestModels = { 'application/json': models.createRequestModel };
        }

        // Add response model if available
        if (models && models.createResponseModel) {
            createMethodOptions.methodResponses = [
                {
                    responseModels: { 'application/json': models.createResponseModel },
                    statusCode: '200'
                }
            ];
        }
        collectionResource.addMethod('POST', context.integration, createMethodOptions);
        // GET /collection/{id} - Get specific item
        itemResource.addMethod(
            'GET',
            context.integration,
            DeploymentRestApiHelper.createMethodOptions(context, `Get${operationPrefix}`)
        );

        // PATCH /collection/{id} - Update item
        const updateMethodOptions = DeploymentRestApiHelper.createMethodOptionsWithModels(
            context,
            `Update${operationPrefix}`,
            models?.updateRequestModel,
            models?.updateResponseModel
        );
        itemResource.addMethod('PATCH', context.integration, updateMethodOptions);
        // DELETE /collection/{id}
        const deleteParams = { 'method.request.querystring.permanent': false };

        itemResource.addMethod(
            'DELETE',
            context.integration,
            DeploymentRestApiHelper.createMethodOptions(context, `Delete${operationPrefix}`, deleteParams)
        );

        return [collectionResource, itemResource];
    }

    /**
     * Adds a custom endpoint to any resource (collection or item)
     * @param context The deployment API context
     * @param parentResource Resource to add endpoint to (can be collection or item resource)
     * @param httpMethod HTTP method (e.g., 'POST', 'GET')
     * @param operationName Operation name for the method
     * @param customPath Optional custom path segment (e.g., 'targets', 'upload-schemas'). If not provided, adds method directly to parentResource
     * @param additionalParams Additional request parameters
     * @returns The resource where the method was added (either new custom resource or the parent resource)
     */
    static addCustomEndpoint(
        context: DeploymentApiContext,
        parentResource: api.Resource,
        httpMethod: string,
        operationName: string,
        customPath?: string,
        additionalParams?: Record<string, any>
    ): api.Resource {
        // If customPath is provided, create a new sub-resource; otherwise use parentResource directly
        const targetResource = customPath ? parentResource.addResource(customPath) : parentResource;

        DeploymentRestApiHelper.configureCors(targetResource, [httpMethod, 'OPTIONS']);

        targetResource.addMethod(
            httpMethod,
            context.integration,
            DeploymentRestApiHelper.createMethodOptions(context, operationName, additionalParams)
        );

        return targetResource;
    }

    /**
     * Collects all resource paths from a set of resources for CDK-nag security suppressions
     * @param resources Array of API Gateway resources
     * @returns Array of resource paths (e.g., ['deployments', 'deployments/{useCaseId}', 'deployments/mcp/{mcp-id}'])
     */
    static collectResourcePaths(resources: api.Resource[]): string[] {
        return resources.map((resource) => resource.path.replace(/^\//, '')); // Remove leading slash
    }
}
