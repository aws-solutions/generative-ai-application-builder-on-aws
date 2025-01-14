// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DescribeStacksCommandInput } from '@aws-sdk/client-cloudformation';
import { DescribeStacksCommandInputBuilder } from '../../cfn/stack-view-builder';
import { ARTIFACT_BUCKET_ENV_VAR } from '../../utils/constants';
import { createUseCaseEvent } from '../event-test-data';

describe('When creating StackCommandBuilders', () => {
    let event: any;
    beforeAll(() => {
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'fake-bucket';
        event = createUseCaseEvent;
    });

    describe('When creating DescribeStacksCommandInputBuilder with a stackInfo', () => {
        let describeStackInput: DescribeStacksCommandInput;

        beforeAll(async () => {
            const stackInfo = {
                stackArn: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                stackName: 'fake-stack-name',
                stackId: 'stack/fake-stack-name/fake-uuid',
                stackInstanceAccount: '123456789012',
                stackInstanceRegion: ':us-west-2'
            };

            try {
                describeStackInput = await new DescribeStacksCommandInputBuilder(stackInfo).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(describeStackInput.StackName).toEqual(
                'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid'
            );
        });
    });

    afterAll(() => {
        delete process.env[ARTIFACT_BUCKET_ENV_VAR];
    });
});
