// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3_asset from 'aws-cdk-lib/aws-s3-assets';
import * as util from '../../lib/utils/common-utils';

import { Match, Template } from 'aws-cdk-lib/assertions';

import { spawnSync } from 'child_process';
import * as rawCdkJson from '../../cdk.json';
import { CustomInfraSetup } from '../../lib/utils/custom-infra-setup';

import mock = require('mock-fs');
import path = require('path');

describe('when local bundling for lambda functions is successful', () => {
    beforeEach(() => {
        mock({
            'tmp': {
                'output': {
                    /* empyt directory */
                }
            }
        });
    });

    it('should return true for node lambda', () => {
        const entry = path.resolve(__dirname, '../mock-lambda-func/node-lambda');
        const outputDir = 'tmp/output';
        util.localBundling(
            `echo "Trying local bundling of assets" && cd ${entry} && npm ci --omit=dev`,
            entry,
            `${outputDir}/nodejs/node_modules/${path.basename(entry)}`
        );
    });

    it('should return true for python lambda', () => {
        const entry = path.resolve(__dirname, '../mock-lambda-func/python-lambda');
        const outputDir = 'tmp/output';
        util.localBundling(
            [
                'echo "Trying local bundling of assets"',
                `cd ${entry}`,
                'rm -fr .venv*',
                'python3 -m venv .venv',
                '. .venv/bin/activate',
                `pip3 install -r requirements.txt -t ${outputDir}`,
                'deactivate',
                'rm -fr .venv*'
            ].join(' && '),
            entry,
            `${outputDir}/python/${path.basename(entry)}`
        );
    });

    afterEach(() => {
        mock.restore();
    });
});

describe('when local bundling for layers is succesful', () => {
    let localBundlingSpy;

    beforeEach(() => {
        mock({
            'tmp': {
                'output': {
                    /* empyt directory */
                }
            }
        });
    });

    afterEach(() => {
        mock.restore();
    });

    it('should call local bundling for node with the commans required to execute layer packaging ', () => {
        expect(
            util.getNodejsLayerLocalBundling(path.resolve(__dirname, '../mock-lambda-func/node-lambda')).tryBundle
        ).toBeTruthy();
    });

    it('should call local bundling for java with the commans required to execute layer packaging ', () => {
        expect(
            util.getJavaLayerLocalBundling(path.resolve(__dirname, '../mock-lambda-func/java-lambda')).tryBundle
        ).toBeTruthy();
    });
});

describe('when local bundling fails', () => {
    beforeEach(() => {
        jest.spyOn({ spawnSync }, 'spawnSync').mockImplementation(() => {
            throw new Error('Fake error for spawnSync');
        });
    });

    it('should throw an error', () => {
        const entry = path.resolve(__dirname, '../mock-lambda-func/node-lambda');
        const outputDir = 'tmp/output';
        try {
            util.localBundling(
                `echo "Trying local bundling of assets" && cd ${entry} && npm ci --omit=dev`,
                entry,
                `${outputDir}/nodejs/node_modules/${path.basename(entry)}`
            );
        } catch (error) {
            expect((error as Error).message).toEqual('Fake error for spawnSync');
        }
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});

describe('when calling resource properties in local synth', () => {
    let stack: cdk.Stack;
    let asset: s3_asset.Asset;
    let customResource: lambda.Function;
    let currentValue: string;
    let resourceProperties: { [key: string]: any };

    beforeAll(() => {
        if (process.env.DIST_OUTPUT_BUCKET) {
            currentValue = process.env.DIST_OUTPUT_BUCKET;
        }
        delete process.env.DIST_OUTPUT_BUCKET;

        stack = new cdk.Stack();
        asset = new s3_asset.Asset(stack, 'Config', {
            path: path.resolve(__dirname, '../mock-lambda-func/python-lambda')
        });
        customResource = new CustomInfraSetup(stack, 'Infra', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            sendAnonymousMetricsCondition: new cdk.CfnCondition(stack, 'TestCondition', {
                expression: cdk.Fn.conditionEquals('Yes', 'Yes')
            })
        }).customResourceLambda;
        resourceProperties = util.getResourceProperties(stack, asset, customResource).properties;
    });

    it('should generate resource properties with cdk staging assets', () => {
        expect(resourceProperties).toStrictEqual({
            SOURCE_BUCKET_NAME: asset.s3BucketName,
            SOURCE_PREFIX: asset.s3ObjectKey
        });
        process.env.DIST_OUTPUT_BUCKET = currentValue;
    });

    it('should generate role policy cdk staging assets', () => {
        const template = Template.fromStack(stack);
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: 's3:GetObject',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        Ref: 'AWS::Partition'
                                    },
                                    ':s3:::',
                                    {
                                        'Fn::Sub': Match.stringLikeRegexp(
                                            '^cdk-[a-z0-9]*-assets-\\${AWS::AccountId}-\\${AWS::Region}$'
                                        )
                                    },
                                    `/*`
                                ]
                            ]
                        }
                    }
                ]
            },
            Roles: [
                {
                    Ref: Match.stringLikeRegexp('CustomResourceLambdaRole*')
                }
            ]
        });
    });

    afterAll(() => {
        if (currentValue) {
            process.env.DIST_OUTPUT_BUCKET = currentValue;
        }
    });
});

describe('when calling resource properties in a builder pipeline', () => {
    let stack: cdk.Stack;
    let asset: s3_asset.Asset;
    let customResource: lambda.Function;
    let template: Template;

    beforeAll(() => {
        if (!process.env.DIST_OUTPUT_BUCKET) {
            process.env.DIST_OUTPUT_BUCKET = 'fake-bucket';
        }
        const app = new cdk.App();
        stack = new cdk.Stack(app);
        asset = new s3_asset.Asset(stack, 'Config', {
            path: '../infrastructure/test/mock-lambda-func/python-lambda'
        });
        customResource = new CustomInfraSetup(stack, 'Infra', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            sendAnonymousMetricsCondition: new cdk.CfnCondition(stack, 'TestCondition', {
                expression: cdk.Fn.conditionEquals('Yes', 'Yes')
            })
        }).customResourceLambda;

        new cdk.CustomResource(stack, 'TestResource', {
            resourceType: 'Custom::FakeResource',
            serviceToken: customResource.functionArn,
            properties: util.getResourceProperties(stack, asset, customResource).properties
        });

        const lambdaFunctionName = 'MyLambdaFunction';
        util.createCustomResourceForLambdaLogRetention(
            stack,
            'MyLambdaFunctionLogRetention',
            lambdaFunctionName,
            customResource.functionArn
        );

        template = Template.fromStack(stack);
    });

    it('should have a custom resource to update log retention', () => {
        template.hasResourceProperties('Custom::CW_LOG_RETENTION', {
            ServiceToken: {
                'Fn::GetAtt': [Match.stringLikeRegexp('InfraCustomResource'), 'Arn']
            },
            FunctionName: 'MyLambdaFunction',
            Resource: 'CW_LOG_RETENTION'
        });
    });

    it('should generate resource properties when pipeline environment is set)', () => {
        template.hasResourceProperties('Custom::FakeResource', {
            ServiceToken: Match.anyValue(),
            SOURCE_BUCKET_NAME: {
                'Fn::Join': [
                    '-',
                    [
                        {
                            'Fn::FindInMap': ['SourceCode', 'General', 'S3Bucket']
                        },
                        { Ref: 'AWS::Region' }
                    ]
                ]
            },
            SOURCE_PREFIX: {
                'Fn::Join': [
                    '',
                    [
                        {
                            'Fn::FindInMap': ['SourceCode', 'General', 'KeyPrefix']
                        },
                        Match.stringLikeRegexp('/asset[a-z0-9]*.zip')
                    ]
                ]
            }
        });
    });

    it('should generate role policy for pipeline build', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: 's3:GetObject',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        Ref: 'AWS::Partition'
                                    },
                                    ':s3:::',
                                    {
                                        'Fn::Join': [
                                            '-',
                                            [
                                                {
                                                    'Fn::FindInMap': ['SourceCode', 'General', 'S3Bucket']
                                                },
                                                {
                                                    'Ref': 'AWS::Region'
                                                }
                                            ]
                                        ]
                                    },
                                    '/',
                                    {
                                        'Fn::FindInMap': ['SourceCode', 'General', 'SolNamePrefix']
                                    },
                                    '/*'
                                ]
                            ]
                        }
                    }
                ]
            },
            Roles: [
                {
                    Ref: Match.stringLikeRegexp('CustomResourceLambdaRole*')
                }
            ]
        });
    });
});

describe('When packaging lambda functions with Java runtime', () => {
    it('should execute local bundling', () => {});
});

describe('generateCfnTemplateUrl', () => {
    let stack: cdk.Stack;
    beforeEach(() => {
        rawCdkJson.context['cdk-asset-bucket'] = 'asset-bucket';
        const app = new cdk.App({ context: rawCdkJson.context });
        stack = new cdk.Stack(app, 'TestStack', {});
    });

    afterEach(() => {
        jest.resetAllMocks();
        delete process.env.DIST_OUTPUT_BUCKET;
    });

    it('should return template URLs for DIST_OUTPUT_BUCKET', () => {
        process.env.DIST_OUTPUT_BUCKET = 'fakebucket';
        const result = util.generateCfnTemplateUrl(stack);

        expect(result).toEqual(['https://%%TEMPLATE_BUCKET_NAME%%.s3.amazonaws.com/%%SOLUTION_NAME%%/*/*.template']);
    });

    it('should return template URLs for cdk-asset-bucket', () => {
        const result = util.generateCfnTemplateUrl(stack);

        expect(result).toEqual([
            'https://asset-bucket.s3.amazonaws.com/*.json',
            'https://s3.*.amazonaws.com/asset-bucket/*.json'
        ]);
    });

    it('should return default template URLs for empty cdk-asset-bucket', () => {
        rawCdkJson.context['cdk-asset-bucket'] = '';
        // Regenerate the stack with the new context value
        const app = new cdk.App({ context: rawCdkJson.context });
        stack = new cdk.Stack(app, 'TestStack', {});
        const result = util.generateCfnTemplateUrl(stack);
        expect(result).toEqual([
            `https://cdk-hnb659fds-assets-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}.s3.amazonaws.com/*.json`,
            `https://s3.*.amazonaws.com/cdk-hnb659fds-assets-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}/*.json`
        ]);
    });
});
