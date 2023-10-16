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
            solutionVersion: rawCdkJson.context.solution_version,
            sendAnonymousMetricsCondition: condition
        });
        new SolutionHelper(stack, 'SolutionHelper', {
            customResource: customInfra.customResourceLambda,
            solutionID: 'SO0999',
            version: 'v9.9.9',
            sendAnonymousMetricsCondition: condition
        });

        template = Template.fromStack(stack);
        jsonTemplate = template.toJSON();
    });

    it('should create a custom resource for anonymous data', () => {
        const customResourceLambda = new Capture();

        template.resourceCountIs('Custom::AnonymousData', 1);
        template.hasResourceProperties('Custom::AnonymousData', {
            ServiceToken: {
                'Fn::GetAtt': [customResourceLambda, 'Arn']
            },
            Resource: 'ANONYMOUS_METRIC'
        });

        expect(jsonTemplate['Resources'][customResourceLambda.asString()]['Type']).toEqual('AWS::Lambda::Function');
    });

    const conditionLogicalId = new Capture();
    it('should have a custom resource block with a condition', () => {
        template.hasResource('Custom::AnonymousData', {
            Type: 'Custom::AnonymousData',
            Properties: Match.anyValue(),
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete',
            Condition: conditionLogicalId
        });
    });

    it('should have a conditions block in the template', () => {
        template.hasCondition(conditionLogicalId.asString(), {
            'Fn::Equals': ['Yes', 'Yes']
        });
    });
});
