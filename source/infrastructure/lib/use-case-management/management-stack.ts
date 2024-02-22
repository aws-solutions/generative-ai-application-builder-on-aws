#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';

import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { RestRequestProcessor } from '../api/rest-request-processor';
import { AppAssetBundler } from '../utils/asset-bundling';
import { createDefaultLambdaRole, generateTemplateMapping } from '../utils/common-utils';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    ARTIFACT_KEY_PREFIX_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    EMAIL_REGEX_PATTERN,
    INTERNAL_EMAIL_DOMAIN,
    IS_INTERNAL_USER_ENV_VAR,
    LAMBDA_TIMEOUT_MINS,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    TYPESCRIPT,
    USE_CASE_API_KEY_SUFFIX_ENV_VAR,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR,
    USE_CASE_MANAGEMENT_NAMESPACE,
    WEBCONFIG_SSM_KEY_ENV_VAR
} from '../utils/constants';
import { ExistingVPCParameters } from '../vpc/exisiting-vpc-params';

export class UseCaseManagementParameters {
    /**
     * Default user email address used to create a cognito user in the user pool.
     */
    defaultUserEmail: string;

    /**
     * The trademark name of the solution
     */
    applicationTrademarkName: string;

    /**
     * The SSM key where template file list is stored as web config
     */
    webConfigSSMKey: string;

    /**
     * The ARN of the Lambda function to use for custom resource implementation.
     */
    customResourceLambdaArn: string;

    /**
     * The ARN of the IAM role to use for custom resource implementation.
     */
    customResourceRoleArn: string;

    /**
     * ID of an existing VPC to be used for the use case. If none is provided, a new VPC will be created.
     */
    existingVpcId: cdk.CfnParameter;

    /**
     * ID of an existing Private Subnet to be used for the use case.
     */
    existingPrivateSubnetIds: cdk.CfnParameter;

    /**
     * SecurityGroup IDs associated with the subnet
     */
    existingSecurityGroupIds: cdk.CfnParameter;

    /**
     * AZs for the VPC
     */
    vpcAzs: cdk.CfnParameter;

    constructor(stack: IConstruct) {
        this.defaultUserEmail = new cdk.CfnParameter(stack, 'DefaultUserEmail', {
            type: 'String',
            description: 'Email required to create the default user for the deployment platform',
            allowedPattern: EMAIL_REGEX_PATTERN,
            constraintDescription: 'Please provide a valid email'
        }).valueAsString;

        this.applicationTrademarkName = new cdk.CfnParameter(stack, 'ApplicationTrademarkName', {
            type: 'String',
            description: 'Trademark name for the application',
            allowedPattern: '[a-zA-Z0-9_ ]+',
            maxLength: 63,
            constraintDescription: 'Please provide a valid trademark name'
        }).valueAsString;

        this.webConfigSSMKey = new cdk.CfnParameter(stack, 'WebConfigSSMKey', {
            type: 'String',
            description: 'SSM key where template file list is stored as web config',
            allowedPattern: '^(\\/[^\\/ ]*)+\\/?$',
            maxLength: 63,
            constraintDescription: 'Please provide a valid web config SSM key'
        }).valueAsString;

        this.customResourceLambdaArn = new cdk.CfnParameter(stack, 'CustomResourceLambdaArn', {
            type: 'String',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):lambda:\\S+:\\d{12}:function:\\S+$',
            description: 'Arn of the Lambda function to use for custom resource implementation.'
        }).valueAsString;

        this.customResourceRoleArn = new cdk.CfnParameter(stack, 'CustomResourceRoleArn', {
            type: 'String',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\S+:role/\\S+$',
            description: 'Arn of the IAM role to use for custom resource implementation.'
        }).valueAsString;

        const captureExistingVPCParamerters = new ExistingVPCParameters(stack);
        this.existingVpcId = captureExistingVPCParamerters.existingVpcId;
        this.existingPrivateSubnetIds = captureExistingVPCParamerters.existingPrivateSubnetIds;
        this.existingSecurityGroupIds = captureExistingVPCParamerters.securityGroupIds;
        this.vpcAzs = captureExistingVPCParamerters.vpcAzs;
    }
}

/**
 * This construct creates a nested stack containing resources for ApiGateway, Cognito User Pool,
 * and the lambda function backing the deployment of use cases.
 */
export class UseCaseManagement extends cdk.NestedStack {
    /**
     * The lambda backing use case management API calls
     */
    public readonly useCaseManagementApiLambda: lambda.Function;

    /**
     * The lambda backing model info API calls
     */
    public readonly modelInfoApiLambda: lambda.Function;

    /**
     * The API being served to allow use case management
     */
    public readonly restApi: api.LambdaRestApi;

    /**
     * The root resource interface of the API Gateway
     */
    public readonly apiRootResource: api.IResource;

    /**
     * Cognito UserPool for users
     */
    public readonly userPool: cognito.IUserPool;

    /**
     * Cognito UserPoolClient for client apps requesting sign-in.
     */
    public readonly userPoolClient: cognito.CfnUserPoolClient;

    /**
     * Cognito authorizer for users
     */
    public readonly userAuthorizer: api.CognitoUserPoolsAuthorizer;

    /**
     * Location of the asset bucket to be used for deploy use case chats
     */
    public readonly assetBucket: string;

    /**
     * A key prefix for where the templates. If templates are in the root of the bucket, this is undefined or empty string
     */
    public readonly objectPrefix: string;

    /**
     * condition to check if vpc configuration should be applied to lambda functions
     */
    protected readonly deployVPCCondition: cdk.CfnCondition;

    /**
     * Parameters for nested stack
     */
    protected readonly stackParameters: UseCaseManagementParameters;

    constructor(scope: Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);
        this.stackParameters = new UseCaseManagementParameters(cdk.Stack.of(this));

        const version = process.env.VERSION ?? this.node.tryGetContext('solution_version');
        const solutionName = process.env.SOLUTION_NAME ?? this.node.tryGetContext('solution_name');

        if (process.env.TEMPLATE_OUTPUT_BUCKET) {
            generateTemplateMapping(this, solutionName, version);
        }

        this.assetBucket = process.env.TEMPLATE_OUTPUT_BUCKET
            ? `${cdk.Fn.findInMap('Template', 'General', 'S3Bucket')}`
            : [
                  'cdk-',
                  `${cdk.DefaultStackSynthesizer.DEFAULT_QUALIFIER}`,
                  '-assets-',
                  `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`
              ].join('');

        if (process.env.TEMPLATE_OUTPUT_BUCKET) {
            this.objectPrefix = `${cdk.Fn.findInMap('Template', 'General', 'KeyPrefix')}`;
        }

        const cfnRoleForDeploy = buildCfnDeployRole(this);

        const lambdaDlq = new sqs.Queue(this, 'UseCaseManagementDLQ', {
            encryption: sqs.QueueEncryption.SQS_MANAGED,
            enforceSSL: true
        });

        const isInternalUserCondition: cdk.CfnCondition = new cdk.CfnCondition(this, 'IsInternalUserCondition', {
            expression: cdk.Fn.conditionEquals(
                cdk.Fn.select(
                    0,
                    cdk.Fn.split('.', cdk.Fn.select(1, cdk.Fn.split('@', this.stackParameters.defaultUserEmail)))
                ),
                INTERNAL_EMAIL_DOMAIN
            )
        });

        this.deployVPCCondition = new cdk.CfnCondition(this, 'DeployVPCCondition', {
            expression: cdk.Fn.conditionNot(
                cdk.Fn.conditionOr(
                    cdk.Fn.conditionEquals(
                        cdk.Fn.join('', this.stackParameters.existingPrivateSubnetIds.valueAsList),
                        ''
                    ),
                    cdk.Fn.conditionEquals(
                        cdk.Fn.join('', this.stackParameters.existingSecurityGroupIds.valueAsList),
                        ''
                    )
                )
            )
        });

        const useCaseMgmtRole = createDefaultLambdaRole(this, 'UseCaseMgmtLambdaRole', this.deployVPCCondition);

        this.useCaseManagementApiLambda = new lambda.Function(this, 'UseCaseMgmt', {
            description: 'Lambda function backing the REST API for use case management',
            code: lambda.Code.fromAsset(
                '../lambda/use-case-management',
                AppAssetBundler.assetOptionsFactory.assetOptions(TYPESCRIPT).options('../lambda/use-case-management')
            ),
            role: useCaseMgmtRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            environment: {
                [ARTIFACT_BUCKET_ENV_VAR]: this.assetBucket,
                ...(this.objectPrefix && {
                    [ARTIFACT_KEY_PREFIX_ENV_VAR]: this.objectPrefix
                }),
                [CFN_DEPLOY_ROLE_ARN_ENV_VAR]: cfnRoleForDeploy.roleArn,
                [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: USE_CASE_MANAGEMENT_NAMESPACE,
                [USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR]: USE_CASE_CONFIG_SSM_PARAMETER_PREFIX,
                [WEBCONFIG_SSM_KEY_ENV_VAR]: this.stackParameters.webConfigSSMKey,
                [TEMPLATE_FILE_EXTN_ENV_VAR]: process.env.TEMPLATE_OUTPUT_BUCKET ? '.template' : '.template.json',
                [USE_CASE_API_KEY_SUFFIX_ENV_VAR]: 'api-key',
                [IS_INTERNAL_USER_ENV_VAR]: cdk.Fn.conditionIf(
                    isInternalUserCondition.logicalId,
                    'true',
                    'false'
                ).toString()
            },
            deadLetterQueue: lambdaDlq
        });

        // Since creating a L2 vpc construct from `fromAttributes` is difficult with conditions, resorting
        // to L1 construct and using escape hatches to set vpc configuration. The L1 construct only requires
        // security group ids, subnet ids to create and configure the ENI for the lambda.
        this.createVpcConfigForLambda(this.useCaseManagementApiLambda);

        const lambdaS3AssetPolicy = new iam.Policy(this, 'S3AssetAccess', {
            statements: [
                new iam.PolicyStatement({
                    actions: ['s3:GetObject'],
                    resources: [`arn:aws:s3:::${this.assetBucket}/*`],
                    effect: iam.Effect.ALLOW
                })
            ]
        });
        lambdaS3AssetPolicy.attachToRole(this.useCaseManagementApiLambda.role!);

        const lambdaCloudFormationPolicy = new iam.Policy(this, 'CloudFormationAccess', {
            statements: [
                new iam.PolicyStatement({
                    actions: ['iam:PassRole'],
                    effect: iam.Effect.ALLOW,
                    resources: [`${cfnRoleForDeploy.roleArn}*`],
                    conditions: {
                        'StringEquals': { 'iam:PassedToService': 'cloudformation.amazonaws.com' }
                    }
                }),
                new iam.PolicyStatement({
                    actions: ['cloudformation:CreateStack'],
                    effect: iam.Effect.ALLOW,
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`
                    ],
                    conditions: {
                        'ForAllValues:StringEquals': {
                            'aws:TagKeys': ['createdVia', 'userId']
                        },
                        'StringEquals': {
                            'cloudformation:RoleArn': [cfnRoleForDeploy.roleArn]
                        }
                    }
                }),
                new iam.PolicyStatement({
                    actions: ['cloudformation:UpdateStack'],
                    effect: iam.Effect.ALLOW,
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`
                    ],
                    conditions: {
                        'StringEquals': {
                            'cloudformation:RoleArn': [cfnRoleForDeploy.roleArn],
                            'aws:RequestTag/createdVia': 'deploymentPlatform'
                        }
                    }
                }),
                new iam.PolicyStatement({
                    actions: ['cloudformation:DeleteStack'],
                    effect: iam.Effect.ALLOW,
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`
                    ],
                    conditions: {
                        'StringEquals': {
                            'cloudformation:RoleArn': [cfnRoleForDeploy.roleArn]
                        }
                    }
                }),
                new iam.PolicyStatement({
                    actions: [
                        'cloudformation:DescribeStacks',
                        'cloudformation:DescribeStackResource',
                        'cloudformation:DescribeStackResources',
                        'cloudformation:ListStacks'
                    ],
                    effect: iam.Effect.ALLOW,
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ssm:GetParameter'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${this.stackParameters.webConfigSSMKey}`
                    ]
                })
            ]
        });
        lambdaCloudFormationPolicy.attachToRole(this.useCaseManagementApiLambda.role!);

        // allows writing and updating the config params for deployed use cases
        const lambdaSSMPolicy = new iam.Policy(this, 'SSMConfigAccess', {
            statements: [
                new iam.PolicyStatement({
                    actions: ['ssm:GetParameter', 'ssm:PutParameter', 'ssm:DeleteParameter'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${USE_CASE_CONFIG_SSM_PARAMETER_PREFIX}/*`
                    ]
                })
            ]
        });
        lambdaSSMPolicy.attachToRole(this.useCaseManagementApiLambda.role!);

        this.modelInfoApiLambda = new lambda.Function(this, 'ModelInfo', {
            description: 'Lambda function backing the REST API for model info',
            code: lambda.Code.fromAsset(
                '../lambda/model-info',
                AppAssetBundler.assetOptionsFactory.assetOptions(TYPESCRIPT).options('../lambda/model-info')
            ),
            role: createDefaultLambdaRole(this, 'ModelInfoLambdaRole', this.deployVPCCondition),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: lambdaDlq
        });

        // Since creating a L2 vpc construct from `fromAttributes` is difficult with conditions, resorting
        // to L1 construct and using escape hatches to set vpc configuration. The L1 construct only requires
        // security group ids, subnet ids to create and configure the ENI for the lambda.
        this.createVpcConfigForLambda(this.modelInfoApiLambda);

        // allows writing and updating the API key for deployments in secrets manager
        const lambdaSecretsManagerPolicy = new iam.Policy(this, 'SecretsManagerAccess', {
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        'secretsmanager:CreateSecret',
                        'secretsmanager:DeleteSecret',
                        'secretsmanager:DescribeSecret',
                        'secretsmanager:PutSecretValue'
                    ],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:*`
                    ]
                })
            ]
        });
        lambdaSecretsManagerPolicy.attachToRole(this.useCaseManagementApiLambda.role!);

        // api related resources
        const requestProcessor = new RestRequestProcessor(this, 'RequestProcessor', {
            useCaseManagementAPILambda: this.useCaseManagementApiLambda,
            modelInfoAPILambda: this.modelInfoApiLambda,
            defaultUserEmail: this.stackParameters.defaultUserEmail,
            applicationTrademarkName: this.stackParameters.applicationTrademarkName,
            customResourceLambdaArn: this.stackParameters.customResourceLambdaArn,
            customResourceRoleArn: this.stackParameters.customResourceRoleArn
        });
        this.restApi = requestProcessor.restEndpoint.restApi;
        this.apiRootResource = requestProcessor.restEndpoint.apiRootResource;
        this.userPool = requestProcessor.userPool;
        this.userPoolClient = requestProcessor.userPoolClient;
        this.userAuthorizer = requestProcessor.userAuthorizer;

        NagSuppressions.addResourceSuppressions(
            this.useCaseManagementApiLambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.modelInfoApiLambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.node.tryFindChild('S3AssetAccess')?.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The "*" is for resources under the asset bucket. The action is narrowed down to "GetObject" to retrieve any object inside the bucket'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.node.tryFindChild('CloudFormationAccess')?.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The "*" is for resources because lambda does not know the cloudformation resources that will be created in the account'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.node.tryFindChild('SSMConfigAccess')?.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The "*" allows access to all the use cases config parameters, which are stored in SSM under a predefined prefix, but the final names are only known at runtime, based on a generated UUID'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(lambdaDlq, [
            {
                id: 'AwsSolutions-SQS3',
                reason: 'This queue is being used as a DLQ on the UseCaseMgmt lambda function.'
            }
        ]);

        NagSuppressions.addResourceSuppressions(lambdaSecretsManagerPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The secret created will be named based on the UUID of the deployment, so wildcard is needed to write the secret.',
                appliesTo: ['Resource::arn:<AWS::Partition>:secretsmanager:<AWS::Region>:<AWS::AccountId>:secret:*']
            }
        ]);
    }

    /**
     * Method to add vpc configuration to lambda functions
     *
     * @param lambdaFunction
     */
    protected createVpcConfigForLambda(lambdaFunction: lambda.Function) {
        const cfnLambdaFunction = lambdaFunction.node.defaultChild as lambda.CfnFunction;
        cfnLambdaFunction.vpcConfig = cdk.Fn.conditionIf(
            this.deployVPCCondition.logicalId,
            {
                SubnetIds: this.stackParameters.existingPrivateSubnetIds,
                SecurityGroupIds: this.stackParameters.existingSecurityGroupIds
            } as lambda.CfnFunction.VpcConfigProperty,
            cdk.Aws.NO_VALUE
        );
    }
}

const buildCfnDeployRole = (scope: Construct): iam.Role => {
    const awsTagKeysCondition = {
        'ForAllValues:StringEquals': {
            'aws:TagKeys': ['createdVia', 'userId']
        }
    };

    const awsCalledViaCondition = {
        'ForAnyValue:StringEquals': {
            'aws:CalledVia': ['cloudformation.amazonaws.com']
        }
    };

    const cfnDeployRole = new iam.Role(scope, 'CfnDeployRole', {
        assumedBy: new iam.ServicePrincipal('cloudformation.amazonaws.com'),
        inlinePolicies: {
            'CfnDeployPolicy': new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'iam:AttachRolePolicy',
                            'iam:CreateRole',
                            'iam:DeleteRole',
                            'iam:DeleteRolePolicy',
                            'iam:DetachRolePolicy',
                            'iam:GetRole',
                            'iam:GetRolePolicy',
                            'iam:PutRolePolicy',
                            'iam:TagRole',
                            'iam:UpdateAssumeRolePolicy',
                            'iam:PassRole'
                        ],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/*`,
                            `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:policy/*`
                        ],
                        conditions: {
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'lambda:AddPermission',
                            'lambda:RemovePermission',
                            'lambda:InvokeFunction',
                            'lambda:CreateFunction',
                            'lambda:DeleteFunction',
                            'lambda:TagResource',
                            'lambda:GetFunction',
                            'lambda:UpdateFunctionConfiguration',
                            'lambda:ListTags',
                            'lambda:UpdateFunctionCode',
                            'lambda:PublishLayerVersion',
                            'lambda:DeleteLayerVersion',
                            'lambda:GetLayerVersion'
                        ],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:*`,
                            `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:layer:*`
                        ],
                        conditions: {
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            's3:CreateBucket',
                            's3:DeleteBucketPolicy',
                            's3:GetBucketPolicy',
                            's3:GetBucketAcl',
                            's3:GetBucketPolicyStatus',
                            's3:GetBucketVersioning',
                            's3:GetEncryptionConfiguration',
                            's3:GetObject',
                            's3:PutBucketPolicy',
                            's3:PutBucketAcl',
                            's3:PutBucketLogging',
                            's3:PutBucketOwnershipControls',
                            's3:PutBucketPolicy',
                            's3:PutBucketPublicAccessBlock',
                            's3:PutBucketVersioning',
                            's3:PutEncryptionConfiguration',
                            's3:PutBucketTagging'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:s3:::*`],
                        conditions: {
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'events:DeleteRule',
                            'events:DescribeRule',
                            'events:PutRule',
                            'events:PutTargets',
                            'events:RemoveTargets'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/*`],
                        conditions: {
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'servicecatalog:TagResource',
                            'servicecatalog:CreateAttributeGroup',
                            'servicecatalog:DeleteAttributeGroup',
                            'servicecatalog:GetAttributeGroup',
                            'servicecatalog:AssociateAttributeGroup',
                            'servicecatalog:DisassociateAttributeGroup',
                            'servicecatalog:UpdateAttributeGroup',
                            'servicecatalog:DeleteApplication',
                            'servicecatalog:AssociateResource',
                            'servicecatalog:UpdateApplication',
                            'servicecatalog:DisassociateResource',
                            'servicecatalog:CreateApplication',
                            'servicecatalog:GetApplication',
                            'servicecatalog:TagResource'
                        ],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:servicecatalog:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:/attribute-groups/*`,
                            `arn:${cdk.Aws.PARTITION}:servicecatalog:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:/applications/*`
                        ],
                        conditions: {
                            ...awsCalledViaCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['cloudformation:DescribeStacks'],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`
                        ],
                        conditions: {
                            ...awsCalledViaCondition,
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'apigateway:CreateRestApi',
                            'apigateway:CreateStage',
                            'apigateway:DeleteRestApi',
                            'apigateway:DeleteStage',
                            'apigateway:TagResource',
                            'apigateway:POST',
                            'apigateway:GET',
                            'apigateway:DELETE',
                            'apigateway:PATCH'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/*`],
                        conditions: {
                            ...awsCalledViaCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'cognito-idp:CreateGroup',
                            'cognito-idp:CreateUserPoolClient',
                            'cognito-idp:AdminCreateUser',
                            'cognito-idp:DeleteGroup',
                            'cognito-idp:AdminDeleteUser',
                            'cognito-idp:CreateUserPoolClient',
                            'cognito-idp:DeleteUserPoolClient',
                            'cognito-idp:AdminAddUserToGroup',
                            'cognito-idp:AdminRemoveUserFromGroup',
                            'cognito-idp:AdminListGroupsForUser',
                            'cognito-idp:SetUserPoolMfaConfig',
                            'cognito-idp:DeleteUserPool'
                        ],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/*`
                        ],
                        conditions: {
                            ...awsCalledViaCondition,
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'dynamodb:DescribeTable',
                            'dynamodb:CreateTable',
                            'dynamodb:DeleteTable',
                            'dynamodb:UpdateTimeToLive',
                            'dynamodb:DescribeTimeToLive',
                            'dynamodb:TagResource',
                            'dynamodb:ListTagsOfResource'
                        ],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`
                        ],
                        conditions: {
                            ...awsTagKeysCondition,
                            ...awsCalledViaCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'cloudfront:CreateFunction',
                            'cloudfront:DescribeFunction',
                            'cloudfront:DeleteFunction',
                            'cloudfront:PublishFunction',
                            'cloudfront:GetFunction',
                            'cloudfront:CreateOriginAccessControl',
                            'cloudfront:DeleteOriginAccessControl',
                            'cloudfront:GetOriginAccessControl',
                            'cloudfront:UpdateOriginAccessControl',
                            'cloudfront:GetOriginAccessControlConfig',
                            'cloudfront:CreateDistribution',
                            'cloudfront:DeleteDistribution',
                            'cloudfront:GetDistribution',
                            'cloudfront:TagResource',
                            'cloudfront:UpdateDistribution',
                            'cloudfront:GetDistributionConfig',
                            'cloudfront:ListTagsForResource',
                            'cloudfront:GetInvalidation',
                            'cloudfront:CreateInvalidation',
                            'cloudfront:CreateResponseHeadersPolicy',
                            'cloudfront:UpdateResponseHeadersPolicy',
                            'cloudfront:DeleteResponseHeadersPolicy',
                            'cloudfront:GetResponseHeadersPolicy'
                        ],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:function/*`,
                            `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:origin-access-control/*`,
                            `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/*`,
                            `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:response-headers-policy/*`
                        ],
                        conditions: {
                            ...awsCalledViaCondition,
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['cloudfront:UpdateFunction'],
                        resources: [`arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:function/*`],
                        conditions: {
                            ...awsCalledViaCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'kms:Encrypt',
                            'kms:Decrypt',
                            'kms:DescribeKey',
                            'kms:GenerateDataKey',
                            'kms:PutKeyPolicy',
                            'kms:TagResource',
                            'kms:EnableKeyRotation',
                            'kms:CreateGrant'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:kms:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:key/*`],
                        conditions: {
                            ...awsCalledViaCondition,
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        actions: ['kms:CreateKey'],
                        effect: iam.Effect.ALLOW,
                        resources: ['*'], // the CreateKey action requires the resource to be '*'. There are additional conditions on the policy to help put guard rails
                        conditions: {
                            ...awsCalledViaCondition,
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['kendra:CreateIndex'],
                        resources: ['*'], // the CreateIndex action requires the resource to be '*'. There are additional conditions on the policy to help put guard rails
                        conditions: {
                            ...awsCalledViaCondition,
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'kendra:DescribeIndex',
                            'kendra:TagResource',
                            'kendra:DeleteIndex',
                            'kendra:UpdateIndex',
                            'kendra:ListTagsForResource'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:kendra:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:index/*`],
                        conditions: {
                            ...awsCalledViaCondition,
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'cloudwatch:DeleteDashboards',
                            'cloudwatch:GetDashboard',
                            'cloudwatch:GetMetricData',
                            'cloudwatch:ListDashboards',
                            'cloudwatch:PutDashboard',
                            'cloudwatch:TagResource'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:cloudwatch::${cdk.Aws.ACCOUNT_ID}:dashboard/*`],
                        conditions: {
                            ...awsCalledViaCondition,
                            ...awsTagKeysCondition
                        }
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'cloudformation:CreateStack',
                            'cloudformation:UpdateStack',
                            'cloudformation:DeleteStack'
                        ],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`
                        ],
                        conditions: {
                            ...awsTagKeysCondition
                        }
                    })
                ]
            })
        }
    });

    const vpcCreationPolicy = new iam.Policy(scope, 'VpcCreationPolicy', {
        statements: [
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ec2:CreateFlowLogs',
                    'ec2:CreateRouteTable',
                    'ec2:CreateRoute',
                    'ec2:DeleteRoute',
                    'ec2:CreateTags',
                    'ec2:createVPC',
                    'ec2:CreateVpcEndpoint',
                    'ec2:DescribeVpcs',
                    'ec2:ModifyVpcAttribute',
                    'ec2:DeleteVpc',
                    'ec2:DeleteRouteTable',
                    'ec2:DeleteVpcEndpoints',
                    'ec2:DeleteFlowLogs',
                    'ec2:CreateSubnet',
                    'ec2:DeleteSubnet',
                    'ec2:ModifySubnetAttribute',
                    'ec2:AssociateRouteTable',
                    'ec2:DisassociateRouteTable',
                    'ec2:CreateInternetGateway',
                    'ec2:DeleteInternetGateway',
                    'ec2:AttachInternetGateway',
                    'ec2:DetachInternetGateway',
                    'ec2:AllocateAddress',
                    'ec2:ReleaseAddress',
                    'ec2:DisassociateAddress',
                    'ec2:CreateNatGateway',
                    'ec2:DeleteNatGateway',
                    'ec2:UpdateSecurityGroupRuleDescriptionsEgress',
                    'ec2:UpdateSecurityGroupRuleDescriptionsIngress',
                    'ec2:CreateNetworkAcl',
                    'ec2:DeleteNetworkAcl',
                    'ec2:ReplaceNetworkAclAssociation',
                    'ec2:CreateNetworkAclEntry',
                    'ec2:DeleteNetworkAclEntry',
                    'ec2:ReplaceNetworkAclEntry'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:route-table/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:security-group/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:vpc*/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:subnet/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:internet-gateway/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:elastic-ip/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:natgateway/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:network-interface/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:network-acl/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:ipam-pool/*`
                ],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ec2:DescribeVpcs',
                    'ec2:DescribeRouteTables',
                    'ec2:DescribeFlowLogs',
                    'ec2:DescribeVpcEndpoints',
                    'ec2:DescribeInternetGateways',
                    'ec2:DescribeSecurityGroups',
                    'ec2:DescribeAvailabilityZones',
                    'ec2:DescribeAccountAttributes',
                    'ec2:DescribeSubnets',
                    'ec2:DescribeAddresses',
                    'ec2:DescribeNatGateways',
                    'ec2:DescribeNetworkInterfaces',
                    'ec2:DescribeNetworkAcls'
                ],
                resources: ['*']
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ec2:CreateSecurityGroup',
                    'ec2:DeleteSecurityGroup',
                    'ec2:RevokeSecurityGroupEgress',
                    'ec2:AuthorizeSecurityGroupIngress',
                    'ec2:AuthorizeSecurityGroupEgress',
                    'ec2:RevokeSecurityGroupIngress',
                    'ec2:CreateTags'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:security-group/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:vpc/*`
                ]
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'logs:CreateLogGroup',
                    'logs:TagResource',
                    'logs:PutRetentionPolicy',
                    'logs:DescribeLogGroups'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`],
                conditions: {
                    ...awsCalledViaCondition,
                    ...awsTagKeysCondition
                }
            })
        ]
    });

    vpcCreationPolicy.attachToRole(cfnDeployRole);

    NagSuppressions.addResourceSuppressions(cfnDeployRole, [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'This the minimum policy required for CloudFormation service to deploy the stack. Where possible there is a condition using aws:CalledVia for supported services'
        }
    ]);

    NagSuppressions.addResourceSuppressions(vpcCreationPolicy, [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'Even though the resource is "*", the actions have been scoped down only to the ones required by the solution',
            appliesTo: [
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:vpc/*',
                'Resource::*',
                'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:security-group/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:route-table/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:vpc-flow-log/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:elastic-ip/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:internet-gateway/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:natgateway/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:network-interface/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:subnet/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:vpc*/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:network-acl/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:ipam-pool/*'
            ]
        }
    ]);

    return cfnDeployRole;
};
