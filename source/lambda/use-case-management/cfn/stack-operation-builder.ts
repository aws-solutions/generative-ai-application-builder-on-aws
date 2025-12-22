// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
    CFN_ON_FAILURE_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR
} from '../utils/constants';

/**
 * Builder interface for create/ update/ delete operation CommandInputs to implement
 */
export abstract class CommandInputBuilder {
    useCase: UseCase;
    roleArn: string | undefined;

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

    setRoleArn(roleArn: string | undefined): void {
        this.validateRoleArn(roleArn);
        this.roleArn = roleArn;
    }

    isRoleArnRequiredForOperation(): boolean {
        if (!this.roleArn) {
            return false;
        }
        return true;
    }

    private validateRoleArn(roleArn: string | undefined): void {
        if (roleArn !== undefined && roleArn !== process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR]) {
            throw new Error('CfnDeploy role arn does not match the role arn environment variable');
        }
    }
}

/**
 * Builder to  build the CommandInput for CreateStackCommandInput
 */
export class CreateStackCommandInputBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildCreateStackCommand' })
    public build(): CreateStackCommandInput {
        logger.debug('Building CreateStackCommandInput');

        const createCommandInput = {
            StackName: `${this.useCase.name}-${this.useCase.shortUUID}`,
            TemplateURL: getTemplateUrl(this.useCase),
            Parameters: parameters(this.useCase.cfnParameters!),
            Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND', 'CAPABILITY_NAMED_IAM'],
            // For easier debugging in dev, prefer ROLLBACK so the stack and events remain visible.
            // Can be overridden via env var to DELETE (original behavior) if desired.
            OnFailure: (process.env[CFN_ON_FAILURE_ENV_VAR] as any) ?? 'ROLLBACK',
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

        // IMPORTANT: CloudFormation needs an execution role to access private TemplateURL objects (e.g., CDK assets bucket).
        // We pass the deploy role here so CFN can assume it during stack creation.
        return process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR]
            ? ({ ...createCommandInput, RoleARN: process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR] } as CreateStackCommandInput)
            : createCommandInput;
    }
}

/**
 * Builder to build the CommandInput for UpdateStackCommandInput
 */
export class UpdateStackCommandInputBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildUpdateStackCommand' })
    public build(): UpdateStackCommandInput {
        const updateCommandInput = {
            StackName: this.useCase.stackId,
            TemplateURL: getTemplateUrl(this.useCase),
            Parameters: updateParameters(this.useCase.cfnParameters!, this.useCase.getRetainedParameterKeys()),
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

        return this.isRoleArnRequiredForOperation() ? addRoleArnToCommandInput(updateCommandInput) : updateCommandInput;
    }
}

/**
 * Builder to build the CommandInput for DeleteStackCommandInput
 */
export class DeleteStackCommandInputBuilder extends CommandInputBuilder {
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###buildDeleteStackCommand' })
    public build(): DeleteStackCommandInput {
        const deleteStackCommandInput = {
            StackName: this.useCase.stackId
        } as DeleteStackCommandInput;

        return this.isRoleArnRequiredForOperation()
            ? addRoleArnToCommandInput(deleteStackCommandInput)
            : deleteStackCommandInput;
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
 * Utility method to build the Parameter array from the Map on updates, marking parameters to be retained
 */
const updateParameters = (cfnParameters: Map<string, string>, retainedParameterKeys: string[]): Parameter[] => {
    let parameterArray: Parameter[] = parameters(cfnParameters);
    for (let parameter of retainedParameterKeys) {
        if (!cfnParameters.has(parameter)) {
            parameterArray.push({
                ParameterKey: parameter,
                UsePreviousValue: true
            });
        }
    }
    return parameterArray;
};

/**
 * Utility method to get template URL using the useCase object that is passed to it
 */
const getTemplateUrl = (useCase: UseCase): string => {
    if (process.env[ARTIFACT_KEY_PREFIX_ENV_VAR]) {
        return `https://${process.env[ARTIFACT_BUCKET_ENV_VAR]}.s3.amazonaws.com/${process.env[ARTIFACT_KEY_PREFIX_ENV_VAR]}/${useCase.templateName}${process.env[TEMPLATE_FILE_EXTN_ENV_VAR]}`;
    } else {
        return `https://${process.env[ARTIFACT_BUCKET_ENV_VAR]}.s3.amazonaws.com/${useCase.templateName}${process.env[TEMPLATE_FILE_EXTN_ENV_VAR]}`;
    }
};

type CommandInputsWithOptionalRoleArn = UpdateStackCommandInput | DeleteStackCommandInput;

const addRoleArnToCommandInput = (commandInput: CommandInputsWithOptionalRoleArn): CommandInputsWithOptionalRoleArn => {
    return {
        ...commandInput,
        RoleARN: process.env[CFN_DEPLOY_ROLE_ARN_ENV_VAR]
    };
};
