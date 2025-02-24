// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../../cdk.json';

import * as crypto from 'crypto';

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';

import { BedrockChat } from '../../lib/bedrock-chat-stack';
import { DeploymentPlatformStack } from '../../lib/deployment-platform-stack';
import { BaseStack } from '../../lib/framework/base-stack';
import { SageMakerChat } from '../../lib/sagemaker-chat-stack';
import { AppRegistry } from '../../lib/utils/app-registry-aspects';

describe('When Solution Stack with a nested stack is registered with AppRegistry', () => {
    let template: Template;
    let app: cdk.App;
    let stack: DeploymentPlatformStack;
    const appRegApplicationCapture = new Capture();
    const expectedTags = {
        'Solutions:ApplicationType': 'AWS-Solutions',
        'Solutions:SolutionID': 'SO0276',
        'Solutions:SolutionName': 'generative-ai-application-builder-on-aws',
        'Solutions:SolutionVersion': rawCdkJson.context.solution_version
    };

    beforeAll(() => {
        app = new cdk.App({
            context: rawCdkJson.context
        });

        stack = new DeploymentPlatformStack(app, 'TestStack', {
            solutionID: rawCdkJson.context.solution_id,
            solutionName: rawCdkJson.context.solution_name,
            solutionVersion: rawCdkJson.context.solution_version,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name
        });
        cdk.Aspects.of(app).add(
            new AppRegistry(stack, 'AppRegistryAspect', {
                solutionName: rawCdkJson.context.solution_name,
                applicationName: rawCdkJson.context.app_registry_name,
                solutionID: rawCdkJson.context.solution_id,
                solutionVersion: rawCdkJson.context.solution_version,
                applicationType: rawCdkJson.context.application_type
            })
        );
        template = Template.fromStack(stack);
    });

    it('should create a ServiceCatalogueRegistry Application', () => {
        expect(app.node.tryGetContext('app_registry_name')).toStrictEqual('GAAB');
        expect(app.node.tryGetContext('solution_name')).toStrictEqual('generative-ai-application-builder-on-aws');
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::Application', 1);
        template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::Application', {
            Name: {
                'Fn::Join': ['', ['App-GAAB-', { Ref: 'AWS::StackName' }]]
            },
            Description: `Service Catalog application to track and manage all your resources for the solution ${expectedTags['Solutions:SolutionName']}`,
            Tags: expectedTags
        });
    });

    it('should create ResourceAssociation for parent stack', () => {
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::ResourceAssociation', 1);
        template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::ResourceAssociation', {
            Application: {
                'Fn::GetAtt': [appRegApplicationCapture, 'Id']
            },
            Resource: {
                Ref: 'AWS::StackId'
            },
            ResourceType: 'CFN_STACK'
        });
    });

    it('should create ResourceAssociation for WebApp Nested Stack', () => {
        const webAppStack = stack.uiDistribution;
        const nestedTemplate = Template.fromStack(webAppStack);
        nestedTemplate.hasResourceProperties('AWS::ServiceCatalogAppRegistry::ResourceAssociation', {
            Application: {
                Ref: Match.anyValue()
            },
            Resource: {
                Ref: 'AWS::StackId'
            },
            ResourceType: 'CFN_STACK'
        });

        template.hasResource('AWS::CloudFormation::Stack', {
            Type: 'AWS::CloudFormation::Stack',
            Properties: Match.anyValue(),
            DependsOn: [Match.anyValue(), Match.anyValue(), 'WebConfig'],
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete',
            Condition: 'DeployWebAppUIInfrastructureCondition'
        });
    });

    const attGrpCapture = new Capture();
    it('should have AttributeGroupAssociation', () => {
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::AttributeGroupAssociation', 1);
        template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::AttributeGroupAssociation', {
            Application: {
                'Fn::GetAtt': [Match.stringLikeRegexp('RegistrySetup*'), 'Id']
            },
            AttributeGroup: {
                'Fn::GetAtt': [attGrpCapture, 'Id']
            }
        });
        expect(template.toJSON()['Resources'][attGrpCapture.asString()]['Type']).toStrictEqual(
            'AWS::ServiceCatalogAppRegistry::AttributeGroup'
        );
    });

    it('should have AttributeGroup', () => {
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::AttributeGroup', 1);
        template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::AttributeGroup', {
            Attributes: {
                applicationType: 'AWS-Solutions',
                solutionID: 'SO0276',
                solutionName: expectedTags['Solutions:SolutionName'],
                version: expectedTags['Solutions:SolutionVersion']
            },
            Name: {
                'Fn::Join': [
                    '',
                    [
                        'AttrGrp-',
                        {
                            Ref: 'AWS::StackName'
                        }
                    ]
                ]
            },
            Description: 'Attributes for Solutions Metadata'
        });
    });
});

describe('When injecting AppRegistry aspect', () => {
    it('The use case stack should have also have DependsOn with DeleteResourceAssociation', () => {
        const stackList: (typeof BaseStack)[] = [BedrockChat, SageMakerChat];
        const solutionID = rawCdkJson.context.solution_id;
        const version = rawCdkJson.context.solution_version;
        const solutionName = rawCdkJson.context.solution_name;
        const applicationType = rawCdkJson.context.application_type;
        const applicationName = rawCdkJson.context.app_registry_name;
        const applicationTrademarkName = rawCdkJson.context.application_trademark_name;

        for (const stack of stackList) {
            const app = new cdk.App();
            const instance = new stack(app, stack.name, {
                description: `(${solutionID}-${stack.name}) - ${solutionName} - ${stack.name} - Version ${version}`,
                synthesizer: new cdk.DefaultStackSynthesizer({
                    generateBootstrapVersionRule: false
                }),
                solutionID: solutionID,
                solutionVersion: version,
                solutionName: `${solutionName}`,
                applicationTrademarkName: applicationTrademarkName,
                stackName: `${stack.name}-${crypto.randomUUID().substring(0, 8)}`
            });

            cdk.Aspects.of(instance).add(
                new AppRegistry(instance, 'AppRegistry', {
                    solutionID: solutionID,
                    solutionVersion: version,
                    solutionName: solutionName,
                    applicationType: applicationType,
                    applicationName: `${applicationName}-${cdk.Fn.ref('UseCaseUUID')}`
                })
            );

            const template = Template.fromStack(instance);

            if (instance.nested) {
                const stackResources = template.findResources('AWS::ServiceCatalogAppRegistry::ResourceAssociation');
                for (const stackResource in stackResources) {
                    expect(
                        stackResources[stackResource]['DependsOn'].includes('DeleteResourceAssociation')
                    ).toBeTruthy();
                }
            }
        }
    });
});
