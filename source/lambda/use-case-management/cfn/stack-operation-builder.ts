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
    CreateStackCommandInput,
    DeleteStackCommandInput,
    DescribeStacksCommandInput,
    Parameter,
    UpdateStackCommandInput
} from '@aws-sdk/client-cloudformation';
import { UseCase } from '../model/use-case';
import { logger, tracer } from '../power-tools-init';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    ARTIFACT_KEY_PREFIX_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    RetainedCfnParameterKeys,
    TEMPLATE_FILE_EXTN_ENV_VAR
} from '../utils/constants';

/**
 * Builder interface for create/ update/ delete operation CommandInputs to implement
 */
export abstract class CommandInputBuilder {
    useCase: UseCase;

    constructor(useCase: UseCase) {
        this.useCase = useCase;
    }

    /**
     * Builds the CommandInput
     * @returns the CommandInput
     */
    abstract build():
        | CreateStackCommandInput
        | UpdateStackCommandInput
        | DeleteStackCommandInput
        | DescribeStacksCommandInput;
}

/**
 * Builder to  build the CommandInput for CreateStackCommandInput
 */
export class CreateStackCommandInputBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildCreateStackCommand' })
    public build(): CreateStackCommandInput {
        logger.debug('Building CreateStackCommandInput');

        return {
            StackName: `${this.useCase.name}-${this.useCase.shortUUID}`,
            TemplateURL: getTemplateUrl(this.useCase),
            Parameters: parameters(this.useCase.cfnParameters!),
            RoleARN: process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR],
            Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND', 'CAPABILITY_NAMED_IAM'],
            OnFailure: 'DELETE',
            Tags: [
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: this.useCase.userId
                }
            ]
        } as CreateStackCommandInput;
    }
}

/**
 * Builder to build the CommandInput for UpdateStackCommandInput
 */
export class UpdateStackCommandInputBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildUpdateStackCommand' })
    public build(): UpdateStackCommandInput {
        return {
            StackName: this.useCase.stackId,
            TemplateURL: getTemplateUrl(this.useCase),
            Parameters: updateParameters(this.useCase.cfnParameters!),
            RoleARN: process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR],
            Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND', 'CAPABILITY_NAMED_IAM'],
            Tags: [
                {
                    Key: 'createdVia',
                    Value: 'deploymentPlatform'
                },
                {
                    Key: 'userId',
                    Value: this.useCase.userId
                }
            ]
        } as UpdateStackCommandInput;
    }
}

/**
 * Builder to build the CommandInput for DeleteStackCommandInput
 */
export class DeleteStackCommandInputBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildDeleteStackCommand' })
    public build(): DeleteStackCommandInput {
        return {
            StackName: this.useCase.stackId,
            RoleARN: process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR]
        } as DeleteStackCommandInput;
    }
}

/**
 * utility method to build the Parameter array from the Map
 */
const parameters = (cfnParameters: Map<string, string>): Parameter[] => {
    let parameterArray: Parameter[] = new Array();
    cfnParameters.forEach((value, key) => {
        parameterArray.push({
            ParameterKey: key,
            ParameterValue: value
        });
    });

    return parameterArray;
};

/**
 * utility method to build the Parameter array from the Map on updates, marking parameters to be retained
 */
const updateParameters = (cfnParameters: Map<string, string>): Parameter[] => {
    let parameterArray: Parameter[] = parameters(cfnParameters);
    for (let parameter of RetainedCfnParameterKeys) {
        if (!cfnParameters.has(parameter)) {
            parameterArray.push({
                ParameterKey: parameter,
                UsePreviousValue: true
            });
        }
    }
    return parameterArray;
};

const getTemplateUrl = (useCase: UseCase): string => {
    if (process.env[ARTIFACT_KEY_PREFIX_ENV_VAR]) {
        return `https://${process.env[ARTIFACT_BUCKET_ENV_VAR]}.s3.amazonaws.com/${process.env[ARTIFACT_KEY_PREFIX_ENV_VAR]}/${useCase.templateName}${process.env[TEMPLATE_FILE_EXTN_ENV_VAR]}`;
    } else {
        return `https://${process.env[ARTIFACT_BUCKET_ENV_VAR]}.s3.amazonaws.com/${useCase.templateName}${process.env[TEMPLATE_FILE_EXTN_ENV_VAR]}`;
    }
};
