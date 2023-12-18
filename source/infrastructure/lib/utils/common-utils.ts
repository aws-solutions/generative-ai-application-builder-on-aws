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
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3_asset from 'aws-cdk-lib/aws-s3-assets';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as log from 'npmlog';
import * as path from 'path';

import { ILocalBundling } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { execSync } from 'child_process';
import { Construct } from 'constructs';

export interface LayerProps {
    /**
     * The path to the root directory of the lambda layer.
     */
    readonly entry: string;

    /**
     * The runtimes compatible with the python layer.
     *
     * @default - All runtimes are supported.
     */
    readonly compatibleRuntimes?: lambda.Runtime[];

    /**
     * Path to lock file
     */
    readonly depsLockFilePath?: string;

    /**
     * Description of the lambda layer
     */
    readonly description?: string;
}

/**
 * Copies all contents from within the source directory and recursively copies them to the
 * destination directory
 *
 * @param srcDir - copy files from (source folder)
 * @param dstDir - copy files to (destination folder)
 */
export function copyFilesSyncRecursively(srcDir: string, dstDir: string) {
    const list = fs.readdirSync(srcDir);
    let src, dst;
    list.forEach((file) => {
        src = `${srcDir}/${file}`;
        dst = `${dstDir}/${file}`;

        const stat = fs.statSync(src);

        if (stat && stat.isDirectory()) {
            if (!fs.existsSync(dst)) {
                fs.mkdirSync(dst);
                copyFilesSyncRecursively(src, dst);
            }
        } else {
            fs.writeFileSync(dst, fs.readFileSync(src));
        }
    });
}

/**
 * Method to locally bundle packages based for specific runtimes
 *
 * @param cliCommand - the command to execute to pull modules for packaging
 * @param entry - the source directory from which to copy the modules/ packages
 * @param targetDirectory - the destination directory for layers to which they should be copied based on the runtime
 *
 * @returns - boolean value indicating if it was successful in packaging modules locally
 */
export function localBundling(cliCommand: string, entry: string, targetDirectory: string): boolean {
    try {
        log.prefixStyle.bold = true;
        log.prefixStyle.fg = 'blue';
        log.enableColor();

        if (!fs.existsSync(targetDirectory)) {
            fs.mkdirSync(targetDirectory, {
                recursive: true
            });
        }

        const result = execSync(cliCommand).toString(); // NOSONAR - this is build/ packaging stage. Safe to execute shell
        log.log('DEBUG', 'ExecSync call:', result);

        copyFilesSyncRecursively(entry, targetDirectory);
    } catch (error) {
        console.error(`Error with local bundling. Error is ${error}`, error);
        return false;
    }
    return true;
}

/**
 * A node implementation for the local bundling exclusively for lambda layers. Layers require that modules be copied
 * to a specific directory.
 *
 * @param entry - the file system path that defines the assets for bundling
 * @returns - an instance of the @type {ILocalBundling} implementation that knows how to bundle a standard nodejs lambda
 * function that uses `package.json` to define libraries and `npm` as its package manager
 */
export function getNodejsLayerLocalBundling(entry: string): ILocalBundling {
    return {
        tryBundle(outputDir: string) {
            const cliCommand = `cd ${entry} && rm -fr node_modules && echo "Trying local bundling of assets" && npm ci --omit=dev`;
            const targetDirectory = `${outputDir}/nodejs/node_modules/${path.basename(entry)}`;
            return localBundling(cliCommand, entry, targetDirectory);
        }
    } as ILocalBundling;
}

/**
 * A node implementation for the local bundling exclusively for lambda layers built on TypeScript. Layers require that
 * modules be copied to a specific directory.
 *
 * @param entry - the file system path that defines the assets for bundling
 * @returns - an instance of the @type {ILocalBundling} implementation that knows how to bundle a standard nodejs lambda
 * function that uses `package.json` to define libraries and `npm` as its package manager
 */
export function getTSLayerLocalBundling(entry: string): ILocalBundling {
    return {
        tryBundle(outputDir: string) {
            const cliCommand = [
                `cd ${entry}`,
                'rm -fr node_modules',
                'echo "Trying local bundling of assets"',
                'npm ci --omit=dev',
                `mkdir -p ${outputDir}/nodejs/node_modules/`,
                `cp -R node_modules/* ${outputDir}/nodejs/node_modules/`
            ].join(' && ');
            const targetDirectory = `${outputDir}/nodejs/node_modules/${path.basename(entry)}`;
            return localBundling(cliCommand, `${entry}/dist`, targetDirectory);
        }
    } as ILocalBundling;
}

/**
 * A local bundling implementation for java based lambda layers. This bundling assumes that the jar is present in the `dist/`
 * directory (and not the `target/` directory as the default maven build). The jar from the `dist/` directory is copied
 * to `java/lib/`.
 *
 * @param entry
 * @returns
 */
export function getJavaLayerLocalBundling(entry: string): ILocalBundling {
    return {
        tryBundle(outputDir) {
            const cliCommand = [
                `cd ${entry}`,
                'rm -fr target',
                'echo "Trying local bundling of assets"',
                'mvn clean package --quiet --no-transfer-progress',
                'echo "--------------------------------------------------------------------------------"',
                'echo "Reporting stale dependencies/ dependencies that need to be upgraded for Java runtimes"',
                'echo "--------------------------------------------------------------------------------"',
                'mvn versions:display-dependency-updates',
                'echo "------------------------------------------------------------------------------"',
                'echo "If necessary run "mvn versions:use-latest-versions" to update dependencies"',
                'echo "------------------------------------------------------------------------------"'
            ].join(' && ');
            const targetDirectory = `${outputDir}/java/lib/`;
            return localBundling(cliCommand, `${entry}/dist/`, targetDirectory);
        }
    } as ILocalBundling;
}

/**
 * This method generates the resource properties required to call the custom resource lambda function. This method checks if the
 * synthesis is being run in a builder pipeline or on a local machine, this method generates policies and resource properties
 * to match the source of the S3 bucket in scope.
 *
 * @param scope - the cdk Construct associated with the call
 * @param asset {s3_asset.Asset} - The bundled asset that represents the email templates/sample documents to be copied
 * @param customResourceLambda {lambda.Function}- the lambda function to which a s3:GetObject policy action would be attached
 *
 * @returns - JSON containing the properties to be passed to the custom resource invocation.
 */
export function getResourceProperties(
    scope: Construct,
    asset: s3_asset.Asset,
    customResourceLambda?: lambda.Function,
    customResourceRole?: iam.IRole
): { [key: string]: any } {
    let assetReadPolicy: iam.Policy;
    let resourcePropertiesJson;

    if (process.env.DIST_OUTPUT_BUCKET) {
        assetReadPolicy = new iam.Policy(scope, 'AssetRead', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['s3:GetObject'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:s3:::${cdk.Fn.join('-', [
                            cdk.Fn.findInMap('SourceCode', 'General', 'S3Bucket'),
                            cdk.Aws.REGION
                        ])}/${cdk.Fn.findInMap('SourceCode', 'General', 'SolNamePrefix')}/*`
                    ]
                })
            ]
        });

        resourcePropertiesJson = {
            SOURCE_BUCKET_NAME: cdk.Fn.join('-', [
                cdk.Fn.findInMap('SourceCode', 'General', 'S3Bucket'),
                cdk.Aws.REGION
            ]),
            SOURCE_PREFIX: `${cdk.Fn.findInMap('SourceCode', 'General', 'KeyPrefix')}/asset${asset.s3ObjectKey}`
        };
    } else {
        assetReadPolicy = new iam.Policy(scope, 'AssetRead', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['s3:GetObject'],
                    resources: [`${asset.bucket.bucketArn}/*`]
                })
            ]
        });

        resourcePropertiesJson = {
            SOURCE_BUCKET_NAME: asset.s3BucketName,
            SOURCE_PREFIX: asset.s3ObjectKey
        };
    }

    if (customResourceLambda) {
        assetReadPolicy.attachToRole(customResourceLambda.role as iam.Role);
    } else if (customResourceRole) {
        assetReadPolicy.attachToRole(customResourceRole);
    }

    NagSuppressions.addResourceSuppressions(
        assetReadPolicy,
        [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The policy is narrowing down the resource path by explicitly before putting a wildcard'
            }
        ],
        true
    );

    if (customResourceLambda) {
        assetReadPolicy.attachToRole(customResourceLambda.role as iam.Role);
    } else if (customResourceRole) {
        assetReadPolicy.attachToRole(customResourceRole);
    }

    return resourcePropertiesJson;
}

/**
 * Method to generate a CDK mapping for the source code location.
 *
 * @param construct - the construct/ stack in scope
 * @param solutionName - the name of the solution as configured in the cdk.json or as environment variable in the build pipeline
 * @param solutionVersion - the version of the solution as configured in the cdk.json or as environment variable in the build pipeline
 */
export function generateSourceCodeMapping(
    construct: Construct,
    solutionName: string,
    solutionVersion: string
): cdk.CfnMapping {
    return new cdk.CfnMapping(construct, 'SourceCode', {
        mapping: {
            General: {
                S3Bucket: process.env.DIST_OUTPUT_BUCKET,
                KeyPrefix: `${solutionName}/${solutionVersion}`,
                SolNamePrefix: `${solutionName}`
            }
        }
    });
}

/**
 * A utility method to generate template mappings solution name prefix.
 *
 * @param construct
 * @param solutionName
 * @param solutionVersion
 * @returns
 */
export function generateTemplateMapping(
    construct: Construct,
    solutionName: string,
    solutionVersion: string
): cdk.CfnMapping {
    return new cdk.CfnMapping(construct, 'Template', {
        mapping: {
            General: {
                S3Bucket: process.env.TEMPLATE_OUTPUT_BUCKET,
                KeyPrefix: `${solutionName}/${solutionVersion}`,
                SolNamePrefix: `${solutionName}`
            }
        }
    });
}

/**
 * A utility method to generate basic CloudWatch policy statement for lambda functions.
 *
 * @param construct
 * @returns
 */
export function createBasicLambdaCWPolicyDocument(): iam.PolicyDocument {
    return new iam.PolicyDocument({
        statements: [
            new iam.PolicyStatement({
                actions: ['logs:CreateLogGroup', 'logs:CreateLogStream'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`
                ]
            }),
            new iam.PolicyStatement({
                actions: ['logs:PutLogEvents'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/*:log-stream:*`
                ]
            })
        ]
    });
}

/**
 * A utility method to generate default lambda role. This method will also add suppressions for
 * cloudwatch policy
 *
 * @param scope
 * @param id
 */
export function createDefaultLambdaRole(scope: Construct, id: string): iam.Role {
    const role = new iam.Role(scope, id, {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
            LambdaFunctionServiceRolePolicy: createBasicLambdaCWPolicyDocument()
        }
    });

    NagSuppressions.addResourceSuppressions(role, [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with tighter permissions.',
            appliesTo: ['Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:/aws/lambda/*']
        }
    ]);
    NagSuppressions.addResourceSuppressions(role, [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'Lambda function has the required permission to write CloudWatch Log streams. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with tighter permissions.',
            appliesTo: [
                'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:/aws/lambda/*:log-stream:*'
            ]
        }
    ]);

    return role;
}

/**
 * Generates a unique hash identfifer using SHA256 encryption algorithm.
 */
export function hashValues(...values: string[]): string {
    const sha256 = crypto.createHash('sha256');
    values.forEach((val) => sha256.update(val));
    return sha256.digest('hex').slice(0, 12);
}
