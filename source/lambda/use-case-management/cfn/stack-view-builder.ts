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
 **********************************************************************************************************************/

import { DescribeStacksCommandInput } from '@aws-sdk/client-cloudformation';
import { StackInfo } from '../model/list-use-cases';
import { tracer } from '../power-tools-init';

/**
 * Builder interface for List/ View CommandInputs to implement
 */
export abstract class CommandInputBuilder {
    stackInfo: StackInfo;

    constructor(stackInfo: StackInfo) {
        this.stackInfo = stackInfo;
    }

    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): DescribeStacksCommandInput;
}

/**
 * Builder to build the CommandInput for DescribeStacksCommandInput. When the stack name is
 * provided as input cfn returns a response only for that stack.
 *
 */
export class DescribeStacksCommandInputBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildDescribeStacksCommand' })
    public build(): DescribeStacksCommandInput {
        return {
            StackName: this.stackInfo.stackArn
        } as DescribeStacksCommandInput;
    }
}
