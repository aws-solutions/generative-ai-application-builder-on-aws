/**********************************************************************************************************************
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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
import * as rawCdkJson from '../../cdk.json';

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';

import { DeploymentPlatformStack } from '../../lib/deployment-platform-stack';
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
        'Solutions:SolutionVersion': 'v1.0.0'
    };

    const applicationName = `App-${rawCdkJson.context.app_registry_name}`;

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
        const webAppStack = stack.uiInfrastructure.nestedUIStack;
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
            DependsOn: [Match.anyValue(), appRegApplicationCapture.asString(), 'WebConfig'],
            UpdateReplacePolicy: Match.anyValue(),
            DeletionPolicy: Match.anyValue(),
            Condition: 'DeployWebApp'
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
