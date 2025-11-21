// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as rawCdkJson from '../../cdk.json';
import { CustomInfraSetup } from '../../lib/utils/custom-infra-setup';
import { SolutionHelper } from '../../lib/utils/solution-helper';

describe('When solution helper construct is created', () => {
    let template: Template;
    let jsonTemplate: { [key: string]: any };

    beforeAll(() => {
        const stack = new cdk.Stack();
        const condition = new cdk.CfnCondition(stack, 'TestCondition', {
            expression: cdk.Fn.conditionEquals('Yes', 'Yes')
        });
        const customInfra = new CustomInfraSetup(stack, 'TestInfra', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version
        });
        new SolutionHelper(stack, 'SolutionHelper', {
            customResource: customInfra.customResourceLambda,
            solutionID: 'SO0999',
            version: 'v9.9.9'
        });

        template = Template.fromStack(stack);
        jsonTemplate = template.toJSON();
    });

    it('should create a custom resource for data', () => {
        const customResourceLambda = new Capture();

        template.resourceCountIs('Custom::Data', 1);
        template.hasResourceProperties('Custom::Data', {
            ServiceToken: {
                'Fn::GetAtt': [customResourceLambda, 'Arn']
            },
            Resource: 'METRIC'
        });

        expect(jsonTemplate['Resources'][customResourceLambda.asString()]['Type']).toEqual('AWS::Lambda::Function');
    });
});
