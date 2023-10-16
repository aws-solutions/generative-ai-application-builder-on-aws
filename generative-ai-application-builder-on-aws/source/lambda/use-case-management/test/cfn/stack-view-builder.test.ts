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

import { DescribeStacksCommandInput } from '@aws-sdk/client-cloudformation';
import { DescribeStacksCommandInputBuilder } from '../../cfn/stack-view-builder';
import { ARTIFACT_BUCKET_ENV_VAR, CFN_DEPLOY_ROLE_ARN_ENV_VAR } from '../../utils/constants';
import { createUseCaseEvent } from '../event-test-data';

describe('When creating StackCommandBuilders', () => {
    let event: any;
    beforeAll(() => {
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'fake-bucket';
        process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] = 'arn:aws:iam::fake-account:role/FakeRole';
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
        delete process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR];
    });
});
