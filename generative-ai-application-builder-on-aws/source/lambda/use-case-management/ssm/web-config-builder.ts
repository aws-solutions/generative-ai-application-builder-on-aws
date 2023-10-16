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
import { WEBCONFIG_SSM_KEY_ENV_VAR } from '../utils/constants';
import { CommandInputBuilder } from './use-case-config-operation-builder';

/**
 *  Builder to build input to get an existing parameter from SSM
 */
export class GetParameterCommandBuilder extends CommandInputBuilder {
    /**
     * Method to create input to get an existing parameter from SSM
     * @returns
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getWebConfigConfigParameter' })
    public build(): GetParameterCommandInput {
        logger.debug('Building web config GetParameterCommandInput');
        return {
            Name: `${process.env[WEBCONFIG_SSM_KEY_ENV_VAR]}`,
            WithDecryption: true
        } as GetParameterCommandInput;
    }
}
