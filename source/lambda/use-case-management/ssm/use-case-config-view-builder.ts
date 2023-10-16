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

import { GetParameterCommandInput } from '@aws-sdk/client-ssm';

import { logger, tracer } from '../power-tools-init';

export abstract class CommandInputBuilder {
    configName: string;

    constructor(configName: string) {
        this.configName = configName;
    }

    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build(): GetParameterCommandInput;
}

export class GetParameterFromNameCommandInputBuilder extends CommandInputBuilder {
    configName: string;

    constructor(configName: string) {
        super(configName);
    }

    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getParameterFromName' })
    public build(): GetParameterCommandInput {
        logger.debug('Building GetParameterCommandInput');
        return {
            Name: this.configName,
            WithDecryption: true
        } as GetParameterCommandInput;
    }
}
