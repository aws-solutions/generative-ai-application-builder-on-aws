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
import { DeleteParameterCommandInput, GetParameterCommandInput, PutParameterCommandInput } from '@aws-sdk/client-ssm';
import { UseCase } from '../model/use-case';
export declare abstract class CommandInputBuilder {
    useCase: UseCase;
    stackId: string;
    constructor(useCase: UseCase);
    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): GetParameterCommandInput | PutParameterCommandInput | DeleteParameterCommandInput;
}
/**
 *  Builder to build input to get an existing parameter from SSM
 */
export declare class GetParameterCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to get an existing parameter from SSM
     * @returns
     */
    build(): GetParameterCommandInput;
}
/**
 * Builder class to create a parameter in SSM
 */
export declare class PutParameterCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create a parameter in SSM
     * @returns
     */
    build(): PutParameterCommandInput;
}
/**
 * Builder to build input to delete a use case record from dynamodb
 */
export declare class DeleteParameterCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create input to delete an existing record in dynamodb
     *
     * @returns
     */
    build(): DeleteParameterCommandInput;
}
