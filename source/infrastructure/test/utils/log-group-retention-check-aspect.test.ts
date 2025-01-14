// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as logs from 'aws-cdk-lib/aws-logs';
import { LogGroupRetentionCheckAspect } from '../../lib/utils/log-group-retention-check-aspect';

describe('LogGroupRetentionCheckAspect', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let template: Template;
    let addWarningSpy: jest.SpyInstance;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');
        addWarningSpy = jest.spyOn(cdk.Annotations.prototype, 'addWarning');
    });

    afterEach(() => {
        addWarningSpy.mockRestore();
    });

    it('should add a warning annotation when log group retention is not set to 10 years', () => {
        new logs.LogGroup(stack, 'TestLogGroup', {
            retention: logs.RetentionDays.ONE_WEEK
        });

        cdk.Aspects.of(app).add(new LogGroupRetentionCheckAspect());
        template = Template.fromStack(stack);

        template.resourceCountIs('AWS::Logs::LogGroup', 1);

        expect(addWarningSpy).toHaveBeenCalledWith(expect.stringContaining('Log group'));
    });

    it('should not add a warning annotation when log group retention is set to 10 years', () => {
        new logs.LogGroup(stack, 'TestLogGroup', {
            retention: logs.RetentionDays.TEN_YEARS
        });

        cdk.Aspects.of(app).add(new LogGroupRetentionCheckAspect());
        template = Template.fromStack(stack);

        template.resourceCountIs('AWS::Logs::LogGroup', 1);
        expect(addWarningSpy).not.toHaveBeenCalled();
    });
});
