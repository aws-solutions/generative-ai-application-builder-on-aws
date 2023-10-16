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
import { CreateStackCommandInput, DeleteStackCommandInput, DescribeStacksCommandInput, UpdateStackCommandInput } from '@aws-sdk/client-cloudformation';
import { UseCase } from '../model/use-case';
/**
 * Builder interface for create/ update/ delete operation CommandInputs to implement
 */
export declare abstract class CommandInputBuilder {
    useCase: UseCase;
    constructor(useCase: UseCase);
    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): CreateStackCommandInput | UpdateStackCommandInput | DeleteStackCommandInput | DescribeStacksCommandInput;
}
/**
 * Builder to  build the CommandInput for CreateStackCommandInput
 */
export declare class CreateStackCommandInputBuilder extends CommandInputBuilder {
    build(): CreateStackCommandInput;
}
/**
 * Builder to build the CommandInput for UpdateStackCommandInput
 */
export declare class UpdateStackCommandInputBuilder extends CommandInputBuilder {
    build(): UpdateStackCommandInput;
}
/**
 * Builder to build the CommandInput for DeleteStackCommandInput
 */
export declare class DeleteStackCommandInputBuilder extends CommandInputBuilder {
    build(): DeleteStackCommandInput;
}
