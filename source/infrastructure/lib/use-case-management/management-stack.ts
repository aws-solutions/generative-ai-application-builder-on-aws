#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';

import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { BaseNestedStack } from '../framework/base-nested-stack';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import {
    createCustomResourceForLambdaLogRetention,
    createDefaultLambdaRole,
    generateCfnTemplateUrl,
    generateTemplateMapping,
    createVpcConfigForLambda
} from '../utils/common-utils';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    ARTIFACT_KEY_PREFIX_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    INTERNAL_EMAIL_DOMAIN,
    IS_INTERNAL_USER_ENV_VAR,
    LAMBDA_TIMEOUT_MINS,
    OPTIONAL_EMAIL_REGEX_PATTERN,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    USE_CASE_API_KEY_SUFFIX_ENV_VAR,
    USE_CASE_MANAGEMENT_NAMESPACE,
    WEBCONFIG_SSM_KEY_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    CLIENT_ID_ENV_VAR,
    USER_POOL_ID_ENV_VAR
} from '../utils/constants';
import { ExistingVPCParameters } from '../vpc/exisiting-vpc-params';
import { CognitoSetup } from '../auth/cognito-setup';
import { SearchAndReplaceRefactorAspect } from '../utils/search-and-replace-refactor-aspect';

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

    /**
     * Domain for the Cognito User Pool Client
     */
    cognitoDomainPrefix: cdk.CfnParameter;

    /**
     * The cloudfront url of the UI application
     */
    cloudFrontUrl: cdk.CfnParameter;

    /**
     * Whether to deploy the web app or not
     */
    deployWebApp: cdk.CfnParameter;

    /**
     * If provided, will use the provided UserPool instead of creating a new one.
     */
    existingCognitoUserPoolId: cdk.CfnParameter;

    /**
     * If provided, will use the provided UserPoolClient instead of creating a new one.
     */
    existingCognitoUserPoolClientId: cdk.CfnParameter;

    constructor(stack: IConstruct) {
        this.defaultUserEmail = new cdk.CfnParameter(stack, 'DefaultUserEmail', {
            type: 'String',
            description: 'Email required to create the default user for the deployment platform',
            allowedPattern: OPTIONAL_EMAIL_REGEX_PATTERN,
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
            maxLength: 128,
            constraintDescription: 'Please provide a valid web config SSM key'
        }).valueAsString;

        this.cognitoDomainPrefix = new cdk.CfnParameter(stack, 'CognitoDomainPrefix', {
            type: 'String',
            description:
                'If you would like to provide a domain for the Cognito User Pool Client, please enter a value. If a value is not provided, the deployment will generate one',
            default: '',
            allowedPattern: '^$|^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$',
            constraintDescription:
                'The provided domain prefix is not a valid format. The domain prefix should be be of the following format "^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$"',
            maxLength: 63
        });

        this.cloudFrontUrl = new cdk.CfnParameter(stack, 'CloudFrontUrl', {
            type: 'String',
            description: 'CloudFront URL for the UI application',
            allowedPattern: '^$|^https:\\/\\/[^\\s]+[\\w]*$',
            default: '',
            constraintDescription: 'If providing a CloudFrontUrl, please provide in a valid format'
        });

        this.deployWebApp = new cdk.CfnParameter(stack, 'DeployUI', {
            type: 'String',
            description:
                'Please select the option to deploy the front end UI for this deployment. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing',
            allowedValues: ['Yes', 'No'],
            default: 'Yes'
        });

        this.existingCognitoUserPoolId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolId', {
            type: 'String',
            allowedPattern: '^$|^[0-9a-zA-Z_-]{9,24}$',
            maxLength: 24,
            description:
                'Optional - UserPoolId of an existing cognito user pool which this use case will be authenticated with. Will be created if not provided',
            default: ''
        });

        this.existingCognitoUserPoolClientId = new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolClientId', {
            type: 'String',
            allowedPattern: '^$|^[a-z0-9]{3,128}$',
            maxLength: 128,
            description:
                'Optional - Provide a User Pool Client (App Client) to use an existing one. If not provided a new User Pool Client will be created. This parameter can only be provided if an existing User Pool Id is provided',
            default: ''
        });

        const captureExistingVPCParameters = new ExistingVPCParameters(stack);
        this.existingVpcId = captureExistingVPCParameters.existingVpcId;
        this.existingPrivateSubnetIds = captureExistingVPCParameters.existingPrivateSubnetIds;
        this.existingSecurityGroupIds = captureExistingVPCParameters.securityGroupIds;
        this.vpcAzs = captureExistingVPCParameters.vpcAzs;
    }
}

/**
 * This construct creates a nested stack containing resources for ApiGateway, Cognito User Pool,
 * and the lambda function backing the deployment of use cases.
 */
export class UseCaseManagement extends BaseNestedStack {
    /**
     * The lambda backing use case management API calls
     */
    public readonly useCaseManagementApiLambda: lambda.Function;

    /**
     * The lambda backing model info API calls
     */
    public readonly modelInfoApiLambda: lambda.Function;

    /**
     * condition to check if vpc configuration should be applied to lambda functions
     */
    public readonly deployVPCCondition: cdk.CfnCondition;

    /**
     * Parameters for nested stack
     */
    public readonly stackParameters: UseCaseManagementParameters;

    /**
     * Dead letter Queue for handling lambda failures
     */
    public readonly dlq: sqs.Queue;

    /**
     * Location of the asset bucket to be used for deploy use case chats
     */
    public readonly assetBucket: string;

    /**
     * A key prefix for where the templates. If templates are in the root of the bucket, this is undefined or empty string
     */
    public readonly objectPrefix: string;


    /**
     * The CognitoSetup construct to use for user pool and client setup
     */
    cognitoSetup: CognitoSetup;

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

        this.dlq = new sqs.Queue(this, 'UseCaseManagementDLQ', {
            encryption: sqs.QueueEncryption.KMS_MANAGED,
            enforceSSL: true
        });

        const isInternalUserCondition: cdk.CfnCondition = new cdk.CfnCondition(this, 'IsInternalUserCondition', {
            expression: cdk.Fn.conditionEquals(
                cdk.Fn.select(
                    0,
                    cdk.Fn.split('.', cdk.Fn.select(1, cdk.Fn.split('@', cdk.Fn.join("", [this.stackParameters.defaultUserEmail, "@example.com"]))))
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

        // create the cognito user pool and group for admin
        this.cognitoSetup = new CognitoSetup(this, 'DeploymentPlatformCognitoSetup', {
            userPoolProps: {
                defaultUserEmail: this.stackParameters.defaultUserEmail,
                applicationTrademarkName: this.stackParameters.applicationTrademarkName,
                userGroupName: 'admin',
                usernameSuffix: 'admin',
                customResourceLambdaArn: this.customResourceLambdaArn,
                cognitoDomainPrefix: this.stackParameters.cognitoDomainPrefix.valueAsString,
                existingCognitoUserPoolId: this.stackParameters.existingCognitoUserPoolId.valueAsString,
                existingCognitoGroupPolicyTableName: ''
            },
            userPoolClientProps: {
                logoutUrl: this.stackParameters.cloudFrontUrl.valueAsString,
                callbackUrl: this.stackParameters.cloudFrontUrl.valueAsString,
                existingCognitoUserPoolClientId: this.stackParameters.existingCognitoUserPoolClientId.valueAsString
            },
            deployWebApp: this.stackParameters.deployWebApp.valueAsString
        });

        //this construct has undergone a refactor from its original definition and many
        //of the resources have new logical IDs. To prevent customers that upgrade existing
        //stacks from experience a resource replacement, leveraging this aspect to search and
        //replace the most critical resources. Examples include, userpool, DDB table, etc.
        cdk.Aspects.of(this.cognitoSetup).add(
            new SearchAndReplaceRefactorAspect({
                // prettier-ignore
                logicalIdMappings: {
                    'DeploymentPlatformCognitoSetupNewUserPool250C9C56': 'RequestProcessorDeploymentPlatformCognitoSetupNewUserPoolB1636A90', //Cognito::UserPool
                    'DeploymentPlatformCognitoSetupCognitoGroupPolicyStore2FB7858C': 'RequestProcessorDeploymentPlatformCognitoSetupCognitoGroupPolicyStore172C3A6A',  //DynamoDB::Table
                    'DeploymentPlatformCognitoSetupDomainPrefixResource4453775F': 'RequestProcessorDeploymentPlatformCognitoSetupDomainPrefixResource314428BF',  //Custom::CognitoDomainPrefix
                    'DeploymentPlatformCognitoSetupUserPoolDomain08A6E8A9': 'RequestProcessorDeploymentPlatformCognitoSetupUserPoolDomain9A80A149',  //Cognito::UserPoolDomain
                    'DeploymentPlatformCognitoSetupDefaultUser49511A3D': 'RequestProcessorDeploymentPlatformCognitoSetupDefaultUser66D30662',  //Cognito::UserPoolUser
                    'DeploymentPlatformCognitoSetupUserGroupF4017C2D': 'RequestProcessorDeploymentPlatformCognitoSetupUserGroup051C1C83',  //Cognito::UserPoolGroup
                    'DeploymentPlatformCognitoSetupUseCaseUserToGroupAttachment5A319E5E': 'RequestProcessorDeploymentPlatformCognitoSetupUseCaseUserToGroupAttachmentE9BBA286',  //Cognito::UserPoolUserToGroupAttachment
                    'DeploymentPlatformCognitoSetupCfnAppClient8E7A08D1': 'RequestProcessorDeploymentPlatformCognitoSetupCfnAppClientD53990B2',  //Cognito::UserPoolClient
                }
            })
        );

        const useCaseMgmtRole = createDefaultLambdaRole(this, 'UCMLRole', this.deployVPCCondition);
        const cfnDeployRole = buildCfnDeployRole(this, useCaseMgmtRole);

        this.useCaseManagementApiLambda = new lambda.Function(this, 'UseCaseMgmt', {
            description: 'Lambda function backing the REST API for use case management',
            code: lambda.Code.fromAsset(
                '../lambda/use-case-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/use-case-management')
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
                [CFN_DEPLOY_ROLE_ARN_ENV_VAR]: cfnDeployRole.roleArn,
                [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: USE_CASE_MANAGEMENT_NAMESPACE,
                [WEBCONFIG_SSM_KEY_ENV_VAR]: this.stackParameters.webConfigSSMKey,
                [TEMPLATE_FILE_EXTN_ENV_VAR]: process.env.TEMPLATE_OUTPUT_BUCKET ? '.template' : '.template.json',
                [USE_CASE_API_KEY_SUFFIX_ENV_VAR]: 'api-key',
                [IS_INTERNAL_USER_ENV_VAR]: cdk.Fn.conditionIf(
                    isInternalUserCondition.logicalId,
                    'true',
                    'false'
                ).toString()
            },
            deadLetterQueue: this.dlq
        });

        // Env vars which need to be passed to use cases on deployment
        this.useCaseManagementApiLambda.addEnvironment(
            COGNITO_POLICY_TABLE_ENV_VAR,
            this.cognitoSetup.getCognitoGroupPolicyTable(this).tableName
        );
        this.useCaseManagementApiLambda.addEnvironment(USER_POOL_ID_ENV_VAR, this.cognitoSetup.getUserPool(this).userPoolId);
        this.useCaseManagementApiLambda.addEnvironment(
            CLIENT_ID_ENV_VAR,
            this.cognitoSetup.getUserPoolClient(this).userPoolClientId
        );

        createCustomResourceForLambdaLogRetention(
            this,
            'UCMLLogRetention',
            this.useCaseManagementApiLambda.functionName,
            this.customResourceLambdaArn
        );

        // Since creating a L2 vpc construct from `fromAttributes` is difficult with conditions, resorting
        // to L1 construct and using escape hatches to set vpc configuration. The L1 construct only requires
        // security group ids, subnet ids to create and configure the ENI for the lambda.
        createVpcConfigForLambda(
            this.useCaseManagementApiLambda,
            this.deployVPCCondition,
            cdk.Fn.join(',', this.stackParameters.existingPrivateSubnetIds.valueAsList),
            cdk.Fn.join(',', this.stackParameters.existingSecurityGroupIds.valueAsList)
        );

        // allows writing and updating the config params for deployed use cases
        const lambdaDDBPolicy = new iam.Policy(this, 'UseCaseConfigAccess', {
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        'dynamodb:CreateTable',
                        'dynamodb:DeleteTable',
                        'dynamodb:DescribeTable',
                        'dynamodb:*TimeToLive', // Describe|Update TimeToLive
                        'dynamodb:ListTagsOfResource',
                        'dynamodb:TagResource'
                    ],
                    resources: [`arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ssm:GetParameter'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${this.stackParameters.webConfigSSMKey}`
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['apigateway:GET'],
                    resources: [`arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/restapis/*`]
                })
            ]
        });
        lambdaDDBPolicy.attachToRole(this.useCaseManagementApiLambda.role!);

        const modelInfoAPILambdaRole = createDefaultLambdaRole(this, 'ModelInfoLambdaRole', this.deployVPCCondition);
        this.modelInfoApiLambda = new lambda.Function(this, 'ModelInfo', {
            description: 'Lambda function backing the REST API for model info',
            code: lambda.Code.fromAsset(
                '../lambda/model-info',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/model-info')
            ),
            role: modelInfoAPILambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: this.dlq
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'ModeInfoLambdaLogRetention',
            this.modelInfoApiLambda.functionName,
            this.customResourceLambdaArn
        );

        // Since creating a L2 vpc construct from `fromAttributes` is difficult with conditions, resorting
        // to L1 construct and using escape hatches to set vpc configuration. The L1 construct only requires
        // security group ids, subnet ids to create and configure the ENI for the lambda.
        createVpcConfigForLambda(
            this.modelInfoApiLambda,
            this.deployVPCCondition,
            cdk.Fn.join(',', this.stackParameters.existingPrivateSubnetIds.valueAsList),
            cdk.Fn.join(',', this.stackParameters.existingSecurityGroupIds.valueAsList)
        );

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

        NagSuppressions.addResourceSuppressions(lambdaDDBPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The resource arn contains wild card because table name is not known. However the arn uses a pre-defined prefix and is narrowed down to the table names starting with that prefix. Also, the API Gateway GET permission requires access to list resources from all REST APIs.'
            }
        ]);

        NagSuppressions.addResourceSuppressions(this.dlq, [
            {
                id: 'AwsSolutions-SQS3',
                reason: 'This queue is being used as a DLQ on the UseCaseMgmt lambda function.'
            }
        ]);

        cfn_nag.addCfnSuppressRules(useCaseMgmtRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.dlq, [
            {
                id: 'W48',
                reason: 'The queue is encrypted using AWS Managed encryption key'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.useCaseManagementApiLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.modelInfoApiLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(modelInfoAPILambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);
    }
}

const buildCfnDeployRole = (scope: Construct, lambdaRole: iam.Role): iam.Role => {
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
            CfnDeployPolicy: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        actions: [
                            'dynamodb:CreateTable',
                            'dynamodb:DeleteTable',
                            'dynamodb:DescribeTable',
                            'dynamodb:DescribeTimeToLive',
                            'dynamodb:ListTagsOfResource',
                            'dynamodb:UpdateTimeToLive',
                            'dynamodb:TagResource'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`]
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['ssm:GetParameter'],
                        resources: [`arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter*`]
                    })
                ]
            })
        }
    });

    const cfnDeployPolicy = new iam.Policy(scope, 'CfnDeployPolicy', {
        statements: [
            new iam.PolicyStatement({
                actions: ['cloudformation:CreateStack', 'cloudformation:UpdateStack'],
                effect: iam.Effect.ALLOW,
                resources: [`arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`],
                conditions: {
                    'ForAllValues:StringEquals': {
                        'aws:TagKeys': ['createdVia', 'userId']
                    },
                    'StringLike': {
                        'cloudformation:TemplateUrl': generateCfnTemplateUrl(scope)
                    }
                }
            }),
            new iam.PolicyStatement({
                actions: ['cloudformation:DeleteStack', 'cloudformation:DescribeStack*', 'cloudformation:ListStacks'],
                effect: iam.Effect.ALLOW,
                resources: [`arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`]
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'iam:CreateRole',
                    'iam:DeleteRole*',
                    'iam:DetachRolePolicy',
                    'iam:GetRole',
                    'iam:ListRoleTags',
                    'iam:*tRolePolicy', // Get|Put RolePolicy
                    'iam:TagRole',
                    'iam:UpdateAssumeRolePolicy'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/*`,
                    `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:policy/*`
                ],
                conditions: {
                    'ForAllValues:StringEquals': {
                        'aws:TagKeys': ['createdVia', 'userId', 'Name']
                    }
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['iam:PassRole'],
                resources: [`arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/*`],
                conditions: {
                    'ForAllValues:StringEquals': {
                        'aws:TagKeys': ['createdVia', 'userId', 'Name']
                    },
                    'StringEquals': {
                        'iam:PassedToService': [
                            'lambda.amazonaws.com',
                            'apigateway.amazonaws.com',
                            'kendra.amazonaws.com',
                            'vpc-flow-logs.amazonaws.com',
                            'cloudformation.amazonaws.com'
                        ]
                    }
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['iam:AttachRolePolicy'],
                resources: [`arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/*`],
                conditions: {
                    ...awsCalledViaCondition,
                    ...awsTagKeysCondition,
                    StringEquals: {
                        'iam:PolicyARN': [
                            `arn:${cdk.Aws.PARTITION}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
                        ]
                    }
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'lambda:AddPermission',
                    'lambda:CreateFunction',
                    'lambda:Delete*',
                    'lambda:GetFunction',
                    'lambda:*LayerVersion', // Get|Publish LayerVersion
                    'lambda:InvokeFunction',
                    'lambda:ListTags',
                    'lambda:RemovePermission',
                    'lambda:TagResource',
                    'lambda:UpdateEventSourceMapping',
                    'lambda:UpdateFunction*'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:*`,
                    `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:layer:*`,
                    `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:event-source-mapping:*`
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
                    's3:GetBucketAcl',
                    's3:GetBucketPolicy*',
                    's3:GetBucketVersioning',
                    's3:*EncryptionConfiguration', // Get|Put EncryptionConfiguration
                    's3:GetObject',
                    's3:PutBucket*'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:s3:::*`]
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'events:DeleteRule',
                    'events:DescribeRule',
                    'events:PutRule',
                    'events:*Targets' // Put|Remove Targets
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/*`]
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['servicecatalog:*'],
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
                actions: [
                    'apigateway:CreateRestApi',
                    'apigateway:CreateStage',
                    'apigateway:DELETE',
                    'apigateway:Delete*',
                    'apigateway:GET',
                    'apigateway:PATCH',
                    'apigateway:POST',
                    'apigateway:PUT',
                    'apigateway:SetWebACL',
                    'apigateway:TagResource',
                    'wafv2:*ForResource',
                    'wafv2:*WebACL',
                    'wafv2:TagResource'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/*`,
                    `arn:${cdk.Aws.PARTITION}:wafv2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:regional/*/*/*`
                ],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cognito-idp:AdminAddUserToGroup',
                    'cognito-idp:AdminCreateUser',
                    'cognito-idp:AdminDeleteUser',
                    'cognito-idp:AdminGetUser',
                    'cognito-idp:AdminListGroupsForUser',
                    'cognito-idp:AdminRemoveUserFromGroup',
                    'cognito-idp:CreateGroup',
                    'cognito-idp:CreateUserPool*',
                    'cognito-idp:Delete*',
                    'cognito-idp:GetGroup',
                    'cognito-idp:SetUserPoolMfaConfig',
                    'cognito-idp:*UserPoolClient' // Describe|Update UserPoolClient
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['cognito-idp:DescribeUserPool'],
                resources: [`arn:${cdk.Aws.PARTITION}:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/*`]
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cloudfront:Create*',
                    'cloudfront:Delete*',
                    'cloudfront:DescribeFunction',
                    'cloudfront:Get*',
                    'cloudfront:ListTagsForResource',
                    'cloudfront:PublishFunction',
                    'cloudfront:TagResource',
                    'cloudfront:Update*'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:function/*`,
                    `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:origin-access-control/*`,
                    `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/*`,
                    `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:response-headers-policy/*`
                ]
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'kms:CreateGrant',
                    'kms:Decrypt',
                    'kms:DescribeKey',
                    'kms:EnableKeyRotation',
                    'kms:Encrypt',
                    'kms:GenerateDataKey',
                    'kms:PutKeyPolicy',
                    'kms:TagResource'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:kms:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:key/*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                actions: [
                    'kms:CreateKey',
                    'kendra:CreateIndex',
                    'lambda:CreateEventSourceMapping',
                    'lambda:DeleteEventSourceMapping',
                    'lambda:GetEventSourceMapping'
                ],
                effect: iam.Effect.ALLOW,
                resources: ['*'], // these actions requires the resource to be '*'. There are additional conditions on the policy to help put guard rails
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'kendra:DescribeIndex',
                    'kendra:ListTagsForResource',
                    'kendra:TagResource',
                    'kendra:UpdateIndex'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:kendra:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:index/*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['cloudwatch:*Dashboard*', 'cloudwatch:GetMetricData', 'cloudwatch:TagResource'],
                resources: [`arn:${cdk.Aws.PARTITION}:cloudwatch::${cdk.Aws.ACCOUNT_ID}:dashboard/*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'sqs:CreateQueue',
                    'sqs:GetQueueAttributes',
                    'sqs:TagQueue',
                    'sqs:DeleteQueue',
                    'sqs:SetQueueAttributes'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:sqs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            })
        ]
    });
    cfnDeployPolicy.attachToRole(lambdaRole);
    cfnDeployPolicy.attachToRole(cfnDeployRole);

    const vpcCreationPolicy = new iam.Policy(scope, 'VpcCreationPolicy', {
        statements: [
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ec2:AllocateAddress',
                    'ec2:AssociateRouteTable',
                    'ec2:AttachInternetGateway',
                    'ec2:AuthorizeSecurityGroup*',
                    'ec2:CreateFlowLogs',
                    'ec2:CreateInternetGateway',
                    'ec2:CreateNatGateway',
                    'ec2:CreateNetworkAcl*',
                    'ec2:CreateRoute*',
                    'ec2:CreateSecurityGroup',
                    'ec2:CreateSubnet',
                    'ec2:CreateTags',
                    'ec2:createVPC*',
                    'ec2:Delete*',
                    'ec2:Detach*',
                    'ec2:Disassociate*',
                    'ec2:Modify*',
                    'ec2:ReleaseAddress',
                    'ec2:ReplaceNetworkAcl*',
                    'ec2:RevokeSecurityGroup*',
                    'ec2:UpdateSecurityGroupRuleDescriptions*'
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
                ]
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['ec2:Describe*'],
                resources: ['*']
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'logs:CreateLogGroup',
                    'logs:DescribeLogGroups',
                    'logs:PutRetentionPolicy',
                    'logs:TagResource',
                    'logs:ListTagsForResource'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`],
                conditions: {
                    ...awsTagKeysCondition
                }
            })
        ]
    });

    vpcCreationPolicy.attachToRole(lambdaRole);
    vpcCreationPolicy.attachToRole(cfnDeployRole);

    NagSuppressions.addResourceSuppressions(cfnDeployPolicy, [
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
                'Resource::*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:vpc/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:vpc*/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:security-group/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:route-table/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:elastic-ip/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:internet-gateway/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:natgateway/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:network-interface/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:subnet/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:network-acl/*',
                'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:ipam-pool/*',
                'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:*',
                'Action::ec2:AuthorizeSecurityGroup*',
                'Action::ec2:CreateNetworkAcl*',
                'Action::ec2:CreateRoute*',
                'Action::ec2:createVPC*',
                'Action::ec2:Delete*',
                'Action::ec2:Describe*',
                'Action::ec2:Detach*',
                'Action::ec2:Disassociate*',
                'Action::ec2:Modify*',
                'Action::ec2:ReplaceNetworkAcl*',
                'Action::ec2:RevokeSecurityGroup*',
                'Action::ec2:UpdateSecurityGroupRuleDescriptions*'
            ]
        }
    ]);

    NagSuppressions.addResourceSuppressions(cfnDeployRole, [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'Resource name is unknown and hence the wild card',
            appliesTo: [
                'Resource::arn:<AWS::Partition>:dynamodb:<AWS::Region>:<AWS::AccountId>:table/*',
                'Resource::arn:<AWS::Partition>:ssm:<AWS::Region>:<AWS::AccountId>:parameter*'
            ]
        }
    ]);

    cfn_nag.addCfnSuppressRules(cfnDeployPolicy, [
        {
            id: 'F4',
            reason: 'Due to policy byte size limitation, had to convert servicecatalog actions to use wildcard'
        }
    ]);

    cfn_nag.addCfnSuppressRules(cfnDeployRole, [
        {
            id: 'F10',
            reason: 'The inline policy is to avoid concurrency issues where a policy is created but not yet attached to the role.'
        }
    ]);

    // this role returned here is used for setting lambda's environment variable. This role is to ensue backward compatibility
    // of existing use case stacks. This role will not be used when new stacks are created in v2.0.0.
    return cfnDeployRole;
};
