// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { USE_CASE_TYPES, ECR_URI_PATTERN } from './utils/constants';
import { Construct } from 'constructs';
import { ApplicationSetup } from './framework/application-setup';
import { BaseStack, BaseStackProps, BaseParameters } from './framework/base-stack';
import { setupAgentCorePermissionsWithPassRole, setupAgentCorePermissions } from './utils/common-utils';
import { AgentExecutionRole } from './use-case-stacks/agent-core/components/agent-execution-role';

export class MCPServerParameters extends BaseParameters {
    /**
     * S3 Bucket Name for the S3 bucket that stores the Lambda/API schema
     */
    public s3BucketName: cdk.CfnParameter;

    /**
     * Optional ECR URI for the container image used by the MCP server through Agentcore Runtime
     */
    public ecrUri: cdk.CfnParameter;

    /**
     * Optional Rest API ID for the existing API Gateway REST API
     */
    protected existingRestApiId: cdk.CfnParameter;

    constructor(stack: cdk.Stack) {
        super(stack);
        this.withAdditionalCfnParameters(stack);
    }

    protected setupCognitoUserPoolClientDomainParams(stack: cdk.Stack): void {
        // Overriding the parent function as the parameters is not necessary for the MCPSeverParameters
    }
    protected withAdditionalCfnParameters(stack: cdk.Stack) {
        this.s3BucketName = new cdk.CfnParameter(stack, 'S3BucketName', {
            type: 'String',
            description: 'S3 Bucket Name for the S3 bucket that stores the Lambda/API schema',
            allowedPattern: '^[a-z0-9][a-z0-9\\-]*[a-z0-9]$',
            constraintDescription: 'Please provide a valid S3 bucket name',
            maxLength: 63
        });

        this.ecrUri = new cdk.CfnParameter(stack, 'EcrUri', {
            type: 'String',
            description: 'Optional ECR URI for the container image used by the MCP server',
            allowedPattern: `^$|${ECR_URI_PATTERN}`,
            constraintDescription:
                'Please provide a valid ECR URI format (e.g., 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:tag) or leave empty',
            maxLength: 200,
            default: ''
        });

        this.existingRestApiId = new cdk.CfnParameter(stack, 'ExistingRestApiId', {
            type: 'String',
            allowedPattern: '^$|^[a-zA-Z0-9]+$',
            description:
                'Optional - Provide the API Gateway REST API ID to use an existing one. If not provided, a new API Gateway REST API will be created. Note that for standalone use cases, existing APIs should have the pre-configured UseCaseDetails (and Feedback if Feedback is enabled) routes with expected models. Additionally, ExistingApiRootResourceId must also be provided.',
            default: ''
        });

        const existingParameterGroups =
            this.cfnStack.templateOptions.metadata?.['AWS::CloudFormation::Interface']?.ParameterGroups || [];

        existingParameterGroups.unshift({
            Label: { default: 'MCP Server Configuration' },
            Parameters: [this.s3BucketName.logicalId, this.ecrUri.logicalId]
        });

        this.cfnStack.templateOptions.metadata = {
            'AWS::CloudFormation::Interface': {
                ParameterGroups: existingParameterGroups
            }
        };
    }
}

/**
 * Stack for MCP (Model Context Protocol) Server infrastructure
 */
export class MCPServerStack extends BaseStack {
    private mcpGatewayRole: iam.Role;
    private agentExecutionRole: AgentExecutionRole;
    private hasExistingRestApiIdCondition: cdk.CfnCondition;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
        this.withAdditionalResourceSetup(props);
    }

    protected withAdditionalResourceSetup(props: BaseStackProps): void {
        super.withAdditionalResourceSetup(props);
        // Setup permissions for custom resource lambda
        const mcpRuntimeName = `gaab_mcp_${this.stackParameters.useCaseShortId}`;
        const mcpGatewayName = `gaab-mcp-${this.stackParameters.useCaseShortId}`;

        this.setupS3Permissions();
        this.setupDynamoDBPermissions();
        setupAgentCorePermissions(this.applicationSetup.customResourceRole);

        this.mcpGatewayRole = this.createMCPGatewayRole(mcpGatewayName);
        this.setupBedrockAgentCoreGatewayPermissions();

        this.agentExecutionRole = new AgentExecutionRole(this, 'MCPAgentExecutionRole', {
            useCaseConfigTableName: this.stackParameters.useCaseConfigTableName.valueAsString
        });

        setupAgentCorePermissionsWithPassRole(
            this.applicationSetup.customResourceRole,
            this.agentExecutionRole.role.roleArn
        );

        const hasEcrImage = new cdk.CfnCondition(this, 'HasEcrImage', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.stackParameters.ecrUri.valueAsString, ''))
        });

        const noEcrImage = new cdk.CfnCondition(this, 'NoEcrImage', {
            expression: cdk.Fn.conditionEquals(this.stackParameters.ecrUri.valueAsString, '')
        });

        const mcpRuntimeResource = new cdk.CustomResource(this, 'CreateMCPRuntime', {
            resourceType: 'Custom::CreateMCPRuntime',
            serviceToken: this.applicationSetup.customResourceLambda.functionArn,
            properties: {
                Resource: 'DEPLOY_MCP_RUNTIME',
                MCPAgentCoreName: mcpRuntimeName,
                USE_CASE_CONFIG_TABLE_NAME: this.stackParameters.useCaseConfigTableName.valueAsString,
                USE_CASE_CONFIG_RECORD_KEY: this.stackParameters.useCaseConfigRecordKey.valueAsString,
                EXECUTION_ROLE_ARN: this.agentExecutionRole.role.roleArn,
                ECR_URI: this.stackParameters.ecrUri.valueAsString,
                COGNITO_USER_POOL_ID: this.stackParameters.existingCognitoUserPoolId.valueAsString,
                COGNITO_USER_POOL_CLIENT_ID: this.stackParameters.existingUserPoolClientId.valueAsString
            }
        });
        (mcpRuntimeResource.node.defaultChild as cdk.CfnCustomResource).cfnOptions.condition = hasEcrImage;

        const mcpGatewayResource = new cdk.CustomResource(this, 'CreateMCPServer', {
            resourceType: 'Custom::CreateMCPServer',
            serviceToken: this.applicationSetup.customResourceLambda.functionArn,
            properties: {
                Resource: 'DEPLOY_MCP_GATEWAY',
                MCPAgentCoreName: mcpGatewayName,
                USE_CASE_CONFIG_TABLE_NAME: this.stackParameters.useCaseConfigTableName.valueAsString,
                USE_CASE_CONFIG_RECORD_KEY: this.stackParameters.useCaseConfigRecordKey.valueAsString,
                USE_CASE_UUID: this.stackParameters.useCaseShortId,
                S3_BUCKET_NAME: this.stackParameters.s3BucketName.valueAsString,
                GATEWAY_ROLE_ARN: this.mcpGatewayRole.roleArn,
                COGNITO_USER_POOL_ID: this.stackParameters.existingCognitoUserPoolId.valueAsString,
                COGNITO_USER_POOL_CLIENT_ID: this.stackParameters.existingUserPoolClientId.valueAsString
            }
        });
        (mcpGatewayResource.node.defaultChild as cdk.CfnCustomResource).cfnOptions.condition = noEcrImage;

        new cdk.CfnOutput(this, 'MCPRuntimeArn', {
            value: mcpRuntimeResource.getAttString('MCPRuntimeArn'),
            description: 'ARN of the created MCP Runtime resource',
            condition: hasEcrImage
        });

        new cdk.CfnOutput(this, 'MCPRuntimeExecutionRoleArn', {
            value: this.agentExecutionRole.role.roleArn,
            description: 'IAM Role ARN used for MCP Runtime execution',
            condition: hasEcrImage
        });

        new cdk.CfnOutput(this, 'MCPGatewayArn', {
            value: mcpGatewayResource.getAttString('GatewayArn'),
            description: 'ARN of the created MCP Gateway resource',
            condition: noEcrImage
        });

        new cdk.CfnOutput(this, 'MCPGatewayRoleArn', {
            value: this.mcpGatewayRole.roleArn,
            description: 'IAM Role ARN used for MCP Gateway operations',
            condition: noEcrImage
        });

        new cdk.CfnMapping(this, 'Solution', {
            mapping: {
                Data: {
                    ID: props.solutionID,
                    Version: props.solutionVersion,
                    SolutionName: props.solutionName,
                    UseCaseName: USE_CASE_TYPES.MCP_SERVER
                }
            }
        });

        // Add anonymous metrics for stack state changes (CREATE/UPDATE/DELETE)
        this.applicationSetup.addMetricsCustomLambda(props.solutionID, props.solutionVersion, {
            USE_CASE_CONFIG_RECORD_KEY: this.stackParameters.useCaseConfigRecordKey.valueAsString,
            USE_CASE_CONFIG_TABLE_NAME: this.stackParameters.useCaseConfigTableName.valueAsString,
            UUID: this.stackParameters.useCaseUUID
        });

        this.addNagSuppressions();
    }

    private createMCPGatewayRole(mcpGatewayName: string): iam.Role {
        const gatewayRole = new iam.Role(this, 'MCPGatewayRole', {
            assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
            description: 'IAM role for MCP Gateway to invoke Lambda functions'
        });

        gatewayRole.attachInlinePolicy(
            new iam.Policy(this, 'GatewayAccessPolicy', {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'bedrock-agentcore:GetWorkloadAccessToken',
                            'bedrock-agentcore:GetResourceApiKey',
                            'bedrock-agentcore:GetResourceOauth2Token'
                        ],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workload-identity-directory/default`,
                            `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workload-identity-directory/default/workload-identity/${mcpGatewayName}-*`
                        ]
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['bedrock-agentcore:GetGateway'],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:gateway/${mcpGatewayName}-*`
                        ]
                    })
                ]
            })
        );

        // Allow gateway to access S3 schemas
        gatewayRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:GetObject'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:s3:::${this.stackParameters.s3BucketName.valueAsString}/mcp/schemas/*`
                ]
            })
        );

        return gatewayRole;
    }

    protected initializeBaseStackParameters(): void {
        // Overriding base stack function ensuring params are not created for MCP Server stack
    }

    protected setupBaseStackResources(props: BaseStackProps): void {
        // Overriding base stack function ensuring resources are not created for MCP Server stack
    }

    protected initializeCfnParameters(): void {
        this.stackParameters = new MCPServerParameters(this);
    }
    /**
     * Define core setup of infrastructure resources like s3 logging bucket, custom resource definitions
     * which are used by root and nested stacks. The root stack should invoke this method and then pass
     * the resources/ resource arns to the nested stack
     *
     * @param props
     * @returns
     */
    protected createApplicationSetup(props: BaseStackProps): ApplicationSetup {
        return new ApplicationSetup(this, 'MCPServerSetup', {
            solutionID: props.solutionID,
            solutionVersion: props.solutionVersion,
            useCaseUUID: this.stackParameters.useCaseShortId
        });
    }

    /**
     * Setup S3 permissions for the custom resource lambda
     */
    private setupS3Permissions(): void {
        const s3BucketAccessPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [
                `arn:${cdk.Aws.PARTITION}:s3:::${this.stackParameters.s3BucketName.valueAsString}`,
                `arn:${cdk.Aws.PARTITION}:s3:::${this.stackParameters.s3BucketName.valueAsString}/*`
            ]
        });

        this.applicationSetup.customResourceRole.addToPolicy(s3BucketAccessPolicy);
    }

    /**
     * Setup DynamoDB permissions for the custom resource lambda
     */
    private setupDynamoDBPermissions(): void {
        const customResourceUseCaseTablePolicy = new iam.PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            resources: [
                `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${this.stackParameters.useCaseConfigTableName.valueAsString}`
            ],
            conditions: {
                'ForAllValues:StringEquals': {
                    'dynamodb:LeadingKeys': [this.stackParameters.useCaseConfigRecordKey.valueAsString]
                }
            },
            effect: iam.Effect.ALLOW
        });

        this.applicationSetup.customResourceRole.addToPolicy(customResourceUseCaseTablePolicy);
    }

    /**
     * Setup Bedrock Agent Core Gateway permissions for the custom resource lambda
     */
    private setupBedrockAgentCoreGatewayPermissions(): void {
        const bedrockAgentCoreGatewayPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock-agentcore:CreateGateway',
                'bedrock-agentcore:UpdateGateway',
                'bedrock-agentcore:DeleteGateway',
                'bedrock-agentcore:GetGateway',
                'bedrock-agentcore:ListGateways',
                'bedrock-agentcore:CreateGatewayTarget',
                'bedrock-agentcore:UpdateGatewayTarget',
                'bedrock-agentcore:DeleteGatewayTarget',
                'bedrock-agentcore:GetGatewayTarget',
                'bedrock-agentcore:ListGatewayTargets',
                'bedrock-agentcore:SynchronizeGatewayTargets'
            ],
            resources: [`arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:gateway/*`]
        });

        const bedrockAgentCoreWorkloadIdentityPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock-agentcore:CreateWorkloadIdentity',
                'bedrock-agentcore:GetWorkloadIdentity',
                'bedrock-agentcore:UpdateWorkloadIdentity',
                'bedrock-agentcore:DeleteWorkloadIdentity'
            ],
            resources: [
                `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workload-identity-directory/*`
            ]
        });

        const passRolePolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['iam:PassRole'],
            resources: [this.mcpGatewayRole.roleArn],
            conditions: {
                StringEquals: {
                    'iam:PassedToService': 'bedrock-agentcore.amazonaws.com'
                }
            }
        });

        // Add credential provider read permissions
        const bedrockAgentCoreCredentialProviderPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['bedrock-agentcore:GetApiKeyCredentialProvider', 'bedrock-agentcore:GetOauth2CredentialProvider'],
            resources: [
                `arn:${cdk.Aws.PARTITION}:bedrock-agentcore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:token-vault/*`
            ]
        });

        // Add IAM permission to update gateway role policies
        const iamPutRolePolicyPermission = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['iam:PutRolePolicy', 'iam:GetRolePolicy', 'iam:DeleteRolePolicy', 'iam:ListRolePolicies'],
            resources: [this.mcpGatewayRole.roleArn]
        });

        this.applicationSetup.customResourceRole.addToPolicy(bedrockAgentCoreGatewayPolicy);
        this.applicationSetup.customResourceRole.addToPolicy(bedrockAgentCoreWorkloadIdentityPolicy);
        this.applicationSetup.customResourceRole.addToPolicy(passRolePolicy);
        this.applicationSetup.customResourceRole.addToPolicy(bedrockAgentCoreCredentialProviderPolicy);
        this.applicationSetup.customResourceRole.addToPolicy(iamPutRolePolicyPermission);
    }

    /**
     * Add NAG suppressions for wildcard permissions in IAM policies
     */
    private addNagSuppressions(): void {
        // Suppress NAG warnings for the custom resource role's default policy
        NagSuppressions.addResourceSuppressions(
            this.applicationSetup.customResourceRole.node.tryFindChild('DefaultPolicy') as iam.Policy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the custom resource lambda to access S3 bucket objects for MCP server schema storage',
                    appliesTo: [`Resource::arn:<AWS::Partition>:s3:::<S3BucketName>/*`]
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the custom resource lambda to manage Bedrock AgentCore runtime resources for MCP server operations',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:runtime/*'
                    ]
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the custom resource lambda to manage Bedrock AgentCore runtime endpoint resources for MCP server operations',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:runtime/*/runtime-endpoint/*'
                    ]
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the custom resource lambda to manage Bedrock AgentCore gateway resources for MCP server operations',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:gateway/*'
                    ]
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the custom resource lambda to manage Bedrock AgentCore workload identity resources for MCP server authentication',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:workload-identity-directory/*'
                    ]
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the custom resource lambda to read credential providers from the token vault for MCP gateway authentication',
                    appliesTo: [
                        'Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:token-vault/*'
                    ]
                }
            ]
        );

        if (this.mcpGatewayRole) {
            NagSuppressions.addResourceSuppressions(
                this.mcpGatewayRole.node.tryFindChild('DefaultPolicy') as iam.Policy,
                [
                    {
                        id: 'AwsSolutions-IAM5',
                        reason: 'The MCP Gateway role requires Lambda invoke permissions for functions in the same account and region as specified in MCP target configurations',
                        appliesTo: [`Resource::arn:<AWS::Partition>:lambda:<AWS::Region>:<AWS::AccountId>:function:*`]
                    },
                    {
                        id: 'AwsSolutions-IAM5',
                        reason: 'The MCP Gateway role requires access to MCP schema files stored under the mcp/schemas/ prefix in the S3 bucket',
                        appliesTo: [`Resource::arn:<AWS::Partition>:s3:::<S3BucketName>/mcp/schemas/*`]
                    }
                ]
            );

            // Add suppressions for GatewayAccessPolicy
            const gatewayAccessPolicy = this.node.tryFindChild('GatewayAccessPolicy') as iam.Policy;
            if (gatewayAccessPolicy) {
                NagSuppressions.addResourceSuppressions(gatewayAccessPolicy, [
                    {
                        id: 'AwsSolutions-IAM5',
                        reason: 'The MCP Gateway role requires access to workload identities with dynamic suffixes based on use case UUID for authentication',
                        appliesTo: [
                            {
                                regex: '/^Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:workload-identity-directory\\/default\\/workload-identity\\/gaab-mcp-.*\\*$/g'
                            }
                        ]
                    },
                    {
                        id: 'AwsSolutions-IAM5',
                        reason: 'The MCP Gateway role requires access to gateways with dynamic suffixes based on use case UUID',
                        appliesTo: [
                            {
                                regex: '/^Resource::arn:<AWS::Partition>:bedrock-agentcore:<AWS::Region>:<AWS::AccountId>:gateway\\/gaab-mcp-.*\\*$/g'
                            }
                        ]
                    }
                ]);
            }
        }
    }
}
