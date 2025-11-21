// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

import { Template } from 'aws-cdk-lib/assertions';

import {
    DeploymentRestApiHelper,
    DeploymentApiContext,
    DeploymentSchema
} from '../../lib/api/deployment-platform-rest-api-helper';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME } from '../../lib/utils/constants';

describe('DeploymentRestApiHelper', () => {
    let stack: cdk.Stack;
    let restApi: api.RestApi;
    let parentResource: api.Resource;
    let mockLambda: lambda.Function;
    let mockAuthorizer: api.IAuthorizer;
    let requestValidator: api.RequestValidator;
    let context: DeploymentApiContext;

    beforeEach(() => {
        stack = new cdk.Stack();

        // Create mock lambda
        mockLambda = new lambda.Function(stack, 'MockLambda', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        });

        // Create REST API
        restApi = new api.RestApi(stack, 'TestApi', {
            restApiName: 'test-api'
        });

        // Create parent resource
        parentResource = restApi.root.addResource('test');

        // Add a dummy method to make the REST API valid for CDK synthesis
        parentResource.addMethod(
            'GET',
            new api.MockIntegration({
                integrationResponses: [{ statusCode: '200' }],
                passthroughBehavior: api.PassthroughBehavior.NEVER,
                requestTemplates: {
                    'application/json': '{"statusCode": 200}'
                }
            }),
            {
                methodResponses: [{ statusCode: '200' }]
            }
        );

        // Create request validator
        requestValidator = new api.RequestValidator(stack, 'MockValidator', {
            restApi: restApi,
            validateRequestBody: true,
            validateRequestParameters: true
        });

        // Create mock authorizer (using interface to avoid CDK validation issues in tests)
        mockAuthorizer = {
            authorizerId: 'test-authorizer-id',
            authorizationType: api.AuthorizationType.CUSTOM
        } as api.IAuthorizer;

        // Create context
        context = {
            scope: stack,
            requestValidator: requestValidator,
            authorizer: mockAuthorizer,
            integration: new api.LambdaIntegration(mockLambda)
        };
    });

    describe('configureCors', () => {
        it('should configure CORS with specified methods', () => {
            const resource = parentResource.addResource('cors-test');
            const allowedMethods = ['GET', 'POST', 'OPTIONS'];

            // This should not throw an error
            expect(() => {
                DeploymentRestApiHelper.configureCors(resource, allowedMethods);
            }).not.toThrow();

            // Verify the resource has CORS configured by checking it has the addCorsPreflight method called
            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'OPTIONS'
            });
        });
    });

    describe('createModel', () => {
        it('should create an API Gateway model with correct properties', () => {
            const modelName = 'TestModel';
            const description = 'Test model description';
            const schema = {
                type: JsonSchemaType.OBJECT,
                properties: {
                    name: { type: JsonSchemaType.STRING }
                }
            };

            const model = DeploymentRestApiHelper.createModel(context, restApi, modelName, description, schema);

            expect(model).toBeDefined();
            expect(model).toBeInstanceOf(api.Model);

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::ApiGateway::Model', {
                ContentType: 'application/json',
                Description: description,
                Name: `${modelName}Model`,
                Schema: schema
            });
        });
    });

    describe('createResourceStructure', () => {
        it('should create collection and item resources with CORS', () => {
            const collectionPath = 'items';
            const singularName = 'item-id';

            const { collectionResource, itemResource } = DeploymentRestApiHelper.createResourceStructure(
                parentResource,
                collectionPath,
                singularName
            );

            expect(collectionResource).toBeDefined();
            expect(itemResource).toBeDefined();
            expect(collectionResource).toBeInstanceOf(api.Resource);
            expect(itemResource).toBeInstanceOf(api.Resource);

            const template = Template.fromStack(stack);

            // Verify collection resource
            template.hasResourceProperties('AWS::ApiGateway::Resource', {
                PathPart: collectionPath
            });

            // Verify item resource with path parameter
            template.hasResourceProperties('AWS::ApiGateway::Resource', {
                PathPart: '{item-id}'
            });

            // Verify CORS methods are created
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'OPTIONS'
            });
        });
    });

    describe('createCrudModels', () => {
        it('should create all CRUD models when schemas provided', () => {
            const operationPrefix = 'TestEntity';
            const schemas: DeploymentSchema = {
                deploy: { type: JsonSchemaType.OBJECT, properties: { name: { type: JsonSchemaType.STRING } } },
                deployResponse: { type: JsonSchemaType.OBJECT, properties: { id: { type: JsonSchemaType.STRING } } },
                update: { type: JsonSchemaType.OBJECT, properties: { name: { type: JsonSchemaType.STRING } } },
                updateResponse: { type: JsonSchemaType.OBJECT, properties: { id: { type: JsonSchemaType.STRING } } }
            };

            const models = DeploymentRestApiHelper.createCrudModels(context, restApi, operationPrefix, schemas);

            expect(models.createRequestModel).toBeDefined();
            expect(models.createResponseModel).toBeDefined();
            expect(models.updateRequestModel).toBeDefined();
            expect(models.updateResponseModel).toBeDefined();

            // Verify models are created in CloudFormation
            const template = Template.fromStack(stack);
            template.resourceCountIs('AWS::ApiGateway::Model', 4);
        });

        it('should return empty object when no schemas provided', () => {
            const operationPrefix = 'TestEntity';

            const models = DeploymentRestApiHelper.createCrudModels(context, restApi, operationPrefix);

            expect(Object.keys(models)).toHaveLength(0);
        });

        it('should create only specified models when partial schemas provided', () => {
            const operationPrefix = 'TestEntity';
            const schemas: DeploymentSchema = {
                deploy: { type: JsonSchemaType.OBJECT, properties: { name: { type: JsonSchemaType.STRING } } }
            };

            const models = DeploymentRestApiHelper.createCrudModels(context, restApi, operationPrefix, schemas);

            expect(models.createRequestModel).toBeDefined();
            expect(models.createResponseModel).toBeUndefined();
            expect(models.updateRequestModel).toBeUndefined();
            expect(models.updateResponseModel).toBeUndefined();

            const template = Template.fromStack(stack);
            template.resourceCountIs('AWS::ApiGateway::Model', 1);
        });
    });

    describe('addCrudOperations', () => {
        let collectionResource: api.Resource;
        let itemResource: api.Resource;

        beforeEach(() => {
            const structure = DeploymentRestApiHelper.createResourceStructure(parentResource, 'entities', 'entity-id');
            collectionResource = structure.collectionResource;
            itemResource = structure.itemResource;
        });

        it('should create all CRUD methods with correct operation names', () => {
            const operationPrefix = 'Entity';

            const resources = DeploymentRestApiHelper.addCrudOperations(
                context,
                collectionResource,
                itemResource,
                operationPrefix
            );

            expect(resources).toHaveLength(2);
            expect(resources[0]).toBe(collectionResource);
            expect(resources[1]).toBe(itemResource);

            // Verify GET /entities (list)
            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'GET',
                OperationName: 'GetEntitys',
                RequestParameters: {
                    'method.request.header.authorization': true,
                    'method.request.querystring.pageNumber': true,
                    'method.request.querystring.searchFilter': false
                }
            });

            // Verify POST /entities (create)
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
                OperationName: 'DeployEntity'
            });

            // Verify GET /entities/{id} (get)
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'GET',
                OperationName: 'GetEntity'
            });

            // Verify PATCH /entities/{id} (update)
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'PATCH',
                OperationName: 'UpdateEntity'
            });

            // Verify DELETE /entities/{id} (delete)
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'DELETE',
                OperationName: 'DeleteEntity',
                RequestParameters: {
                    'method.request.header.authorization': true,
                    'method.request.querystring.permanent': false
                }
            });
        });

        it('should create CRUD operations with models when schemas provided', () => {
            const operationPrefix = 'Entity';
            const schemas: DeploymentSchema = {
                deploy: { type: JsonSchemaType.OBJECT, properties: { name: { type: JsonSchemaType.STRING } } },
                deployResponse: { type: JsonSchemaType.OBJECT, properties: { id: { type: JsonSchemaType.STRING } } }
            };

            DeploymentRestApiHelper.addCrudOperations(
                context,
                collectionResource,
                itemResource,
                operationPrefix,
                restApi,
                schemas
            );

            // Verify models are created
            const template = Template.fromStack(stack);
            template.resourceCountIs('AWS::ApiGateway::Model', 2);

            // Check what models were created
            const models = template.findResources('AWS::ApiGateway::Model');
            const modelNames = Object.keys(models).map((key) => models[key].Properties?.Name);
            expect(modelNames).toContain('DeployEntityApiBodyModel');
            expect(modelNames).toContain('DeployEntityResponseModel');

            // Check how many methods are created and what they are
            const methods = template.findResources('AWS::ApiGateway::Method');

            // We should have 5 CRUD methods + OPTIONS methods
            expect(Object.keys(methods)).toHaveLength(8); // 5 CRUD + 3 OPTIONS (collection, item, and one more)

            // Find the POST method and check its properties
            const postMethodKey = Object.keys(methods).find(
                (key) =>
                    methods[key].Properties?.HttpMethod === 'POST' &&
                    methods[key].Properties?.OperationName === 'DeployEntity'
            );

            expect(postMethodKey).toBeDefined();

            const postMethod = methods[postMethodKey!];

            // Check if it has request models
            expect(postMethod.Properties?.RequestModels).toBeDefined();
            expect(postMethod.Properties?.RequestModels?.['application/json']).toBeDefined();

            // Verify the request model reference
            const requestModelRef = postMethod.Properties?.RequestModels?.['application/json']?.Ref;
            expect(requestModelRef).toMatch(/DeployEntityApiBodyModel/);
        });
    });

    describe('addCustomEndpoint', () => {
        it('should add method directly to resource when no customPath provided', () => {
            const testResource = parentResource.addResource('endpoint-test');
            const resource = DeploymentRestApiHelper.addCustomEndpoint(context, testResource, 'POST', 'TestOperation');

            expect(resource).toBe(testResource);

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
                OperationName: 'TestOperation',
                RequestParameters: {
                    'method.request.header.authorization': true
                }
            });
        });

        it('should create new sub-resource when customPath provided', () => {
            const customPath = 'custom-endpoint';

            const resource = DeploymentRestApiHelper.addCustomEndpoint(
                context,
                parentResource,
                'POST',
                'CustomOperation',
                customPath
            );

            expect(resource).not.toBe(parentResource);

            // Verify new resource is created
            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::ApiGateway::Resource', {
                PathPart: customPath
            });

            // Verify method is added to new resource
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
                OperationName: 'CustomOperation'
            });
        });

        it('should support additional parameters', () => {
            const testResource = parentResource.addResource('params-test');
            const additionalParams = {
                'method.request.querystring.filter': true,
                'method.request.header.custom': false
            };

            DeploymentRestApiHelper.addCustomEndpoint(
                context,
                testResource,
                'GET',
                'TestWithParams',
                undefined,
                additionalParams
            );

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'GET',
                RequestParameters: {
                    'method.request.header.authorization': true,
                    'method.request.querystring.filter': true,
                    'method.request.header.custom': false
                }
            });
        });
    });

    describe('collectResourcePaths', () => {
        it('should collect resource paths correctly', () => {
            const resource1 = parentResource.addResource('path1');
            const resource2 = resource1.addResource('path2');
            const resource3 = parentResource.addResource('path3');

            const resources = [resource1, resource2, resource3];
            const paths = DeploymentRestApiHelper.collectResourcePaths(resources);

            expect(paths).toEqual(['test/path1', 'test/path1/path2', 'test/path3']);
        });

        it('should handle empty resource array', () => {
            const paths = DeploymentRestApiHelper.collectResourcePaths([]);
            expect(paths).toEqual([]);
        });
    });

    describe('integration tests', () => {
        it('should create a complete API structure with CRUD and custom endpoints', () => {
            // Create resource structure
            const { collectionResource, itemResource } = DeploymentRestApiHelper.createResourceStructure(
                parentResource,
                'products',
                'product-id'
            );

            // Add CRUD operations
            const crudResources = DeploymentRestApiHelper.addCrudOperations(
                context,
                collectionResource,
                itemResource,
                'Product'
            );

            // Add custom endpoints
            const uploadResource = DeploymentRestApiHelper.addCustomEndpoint(
                context,
                collectionResource,
                'POST',
                'UploadProducts',
                'upload'
            );

            const exportResource = DeploymentRestApiHelper.addCustomEndpoint(
                context,
                collectionResource,
                'GET',
                'ExportProducts',
                'export'
            );

            // Verify all resources are created
            expect(crudResources).toHaveLength(2);
            expect(uploadResource).toBeDefined();
            expect(exportResource).not.toBe(collectionResource);

            // Verify complete API structure
            const template = Template.fromStack(stack);
            template.resourceCountIs('AWS::ApiGateway::Resource', 5); // root + test + products + {product-id} + upload + export
            template.resourceCountIs('AWS::ApiGateway::Method', 12); // 5 CRUD + 2 custom + 1 dummy + 4 OPTIONS
        });
    });
});
