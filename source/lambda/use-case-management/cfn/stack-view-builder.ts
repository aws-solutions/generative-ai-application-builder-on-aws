// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
