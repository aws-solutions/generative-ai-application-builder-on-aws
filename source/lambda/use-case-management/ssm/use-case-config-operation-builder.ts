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

import {
    DeleteParameterCommandInput,
    GetParameterCommandInput,
    PutParameterCommandInput,
    ParameterTier,
    ParameterType
} from '@aws-sdk/client-ssm';
import { UseCase } from '../model/use-case';
import { logger, tracer } from '../power-tools-init';

export abstract class CommandInputBuilder {
    useCase: UseCase;
    stackId: string;

    constructor(useCase: UseCase) {
        this.useCase = useCase;
    }

    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): GetParameterCommandInput | PutParameterCommandInput | DeleteParameterCommandInput;
}

/**
 *  Builder to build input to get an existing parameter from SSM
 */
export class GetParameterCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to get an existing parameter from SSM
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###updateConfigParameter' })
    public build(): GetParameterCommandInput {
        logger.debug('Building GetParameterCommandInput');
        return {
            Name: this.useCase.getSSMParameterKey(),
            WithDecryption: true
        } as GetParameterCommandInput;
    }
}

/**
 * Builder class to create a parameter in SSM
 */
export class PutParameterCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create a parameter in SSM
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###createConfigParameter' })
    public build(): PutParameterCommandInput {
        logger.debug('Building PutParameterCommandInput');
        return {
            Name: this.useCase.getSSMParameterKey(),
            Description: `Configuration for the use case with ID ${this.useCase.shortUUID}`,
            Value: JSON.stringify(this.useCase.configuration),
            Type: ParameterType.SECURE_STRING,
            Overwrite: true,
            Tier: ParameterTier.INTELLIGENT_TIERING
        } as PutParameterCommandInput;
    }
}

/**
 * Builder to build input to delete a use case record from dynamodb
 */
export class DeleteParameterCommandInputBuilder extends CommandInputBuilder {
    /**
     * Method to create input to delete an existing record in dynamodb
     *
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###deleteConfigParameter' })
    public build(): DeleteParameterCommandInput {
        logger.debug('Building DeleteParameterCommandInput');
        return {
            Name: this.useCase.getSSMParameterKey()
        } as DeleteParameterCommandInput;
    }
}
