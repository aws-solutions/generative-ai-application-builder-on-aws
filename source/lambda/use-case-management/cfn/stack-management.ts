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

import { MetricUnits } from '@aws-lambda-powertools/metrics';
import {
    CloudFormationClient,
    CreateStackCommand,
    CreateStackCommandOutput,
    DeleteStackCommand,
    DeleteStackCommandOutput,
    DescribeStacksCommand,
    DescribeStacksCommandOutput,
    Stack,
    UpdateStackCommand,
    UpdateStackCommandOutput
} from '@aws-sdk/client-cloudformation';
import { SSMClient } from '@aws-sdk/client-ssm';
import { customAwsConfig } from 'aws-node-user-agent-config';
import { StackInfo } from '../model/list-use-cases';
import { UseCase } from '../model/use-case';
import { logger, metrics, tracer } from '../power-tools-init';
import {
    CreateStackCommandInputBuilder,
    DeleteStackCommandInputBuilder,
    UpdateStackCommandInputBuilder
} from './stack-operation-builder';
import { DescribeStacksCommandInputBuilder } from './stack-view-builder';
import { CloudWatchMetrics } from '../utils/constants';

export interface UseCaseStackDetails {
    status: string | undefined;
    webConfigKey: string | undefined;
    chatConfigSSMParameterName: string | undefined;
    cloudFrontWebUrl: string | undefined;
    defaultUserEmail: string | undefined;
    kendraIndexId: string | undefined;
    cloudwatchDashboardUrl: string | undefined;
    useCaseUUID: string | undefined;
    ragEnabled: string | undefined;
    providerApiKeySecret: string | undefined;
}

/**
 * Class to manage use case stacks
 */
export class StackManagement {
    private cfnClient: CloudFormationClient;

    private ssmClient: SSMClient;

    constructor() {
        this.cfnClient = new CloudFormationClient(customAwsConfig());
        this.ssmClient = new SSMClient(customAwsConfig());
        tracer.captureAWSv3Client(this.cfnClient);
        tracer.captureAWSv3Client(this.ssmClient);
    }
    /**
     * Method that creates a use case stack using cloudformation
     *
     * @param useCase - the parameters required to pass to cloudformation
     * @returns stackId - the id of the created stack
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###createStack' })
    public async createStack(useCase: UseCase): Promise<string> {
        const input = await new CreateStackCommandInputBuilder(useCase).build(); //NOSONAR - removing await, input is empty
        const command = new CreateStackCommand(input);

        let response: CreateStackCommandOutput;
        try {
            response = await this.cfnClient.send(command);
            metrics.addMetric(CloudWatchMetrics.UC_INITIATION_SUCCESS, MetricUnits.Count, 1);
            logger.debug(`StackId: ${response.StackId}`);
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.UC_INITIATION_FAILURE, MetricUnits.Count, 1);
            logger.error(`Error occurred when creating stack, error is ${error}`);
            throw error;
        } finally {
            metrics.publishStoredMetrics();
        }

        return response.StackId!;
    }

    /**
     * Method to delete a use case stack
     *
     * @param stackId
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateStack' })
    public async updateStack(useCase: UseCase): Promise<string> {
        const input = await new UpdateStackCommandInputBuilder(useCase).build(); //NOSONAR - removing await, input is empty
        const command = new UpdateStackCommand(input);
        let response: UpdateStackCommandOutput;
        try {
            response = await this.cfnClient.send(command);
            metrics.addMetric(CloudWatchMetrics.UC_UPDATE_SUCCESS, MetricUnits.Count, 1);
            logger.debug(`StackId: ${response.StackId}`);
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.UC_UPDATE_FAILURE, MetricUnits.Count, 1);
            logger.error(`Error occurred when updating stack, error is ${error}`);
            throw error;
        } finally {
            metrics.publishStoredMetrics();
        }
        return response.StackId!;
    }

    /**
     * Method to update a use case stack
     *
     * @param stackId
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteStack' })
    public async deleteStack(useCase: UseCase): Promise<void> {
        const input = await new DeleteStackCommandInputBuilder(useCase).build(); //NOSONAR - removing await, input is empty
        const command = new DeleteStackCommand(input);
        let response: DeleteStackCommandOutput;
        try {
            response = await this.cfnClient.send(command);
            metrics.addMetric(CloudWatchMetrics.UC_DELETION_SUCCESS, MetricUnits.Count, 1);
            logger.debug(`StackId: ${response}`);
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.UC_DELETION_FAILURE, MetricUnits.Count, 1);
            logger.error(`Error occurred when deleting stack, error is ${error}`);
            throw error;
        } finally {
            metrics.publishStoredMetrics();
        }
    }

    /**
     * Method to view the details of a use case stack
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###getStackDetails' })
    public async getStackDetails(stackInfo: StackInfo): Promise<UseCaseStackDetails> {
        const input = await new DescribeStacksCommandInputBuilder(stackInfo).build(); //NOSONAR - removing await, input is empty
        const command = new DescribeStacksCommand(input);

        let response: DescribeStacksCommandOutput;
        try {
            response = await this.cfnClient.send(command);
            metrics.addMetric(CloudWatchMetrics.UC_DESCRIBE_SUCCESS, MetricUnits.Count, 1);

            // extra error handling to ensure we only get the first stack
            if (response.Stacks!.length > 1) {
                throw new Error('More than one stack returned');
            }
            return StackManagement.parseStackDetails(response.Stacks![0]);
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.UC_DESCRIBE_FAILURE, MetricUnits.Count, 1);
            logger.error(`Error occurred when describing stack, error is ${error}`);
            throw error;
        } finally {
            metrics.publishStoredMetrics();
        }
    }

    /**
     * Parse the stack details to get a subset of the required details
     * @param stackDetails response of describe stack for a single stack
     */
    private static parseStackDetails = (stackDetails: Stack): UseCaseStackDetails => {
        const findParameterValue = (key: string): string | undefined => {
            return stackDetails.Parameters?.find((param) => param.ParameterKey === key)?.ParameterValue;
        };

        const findOutputValue = (key: string): string | undefined => {
            return stackDetails.Outputs?.find((param) => param.OutputKey === key)?.OutputValue;
        };

        return {
            status: stackDetails.StackStatus,
            chatConfigSSMParameterName: findParameterValue('ChatConfigSSMParameterName'),
            defaultUserEmail: findParameterValue('DefaultUserEmail'),
            useCaseUUID: findParameterValue('UseCaseUUID'),
            ragEnabled: findParameterValue('RAGEnabled'),
            webConfigKey: findOutputValue('WebConfigKey'),
            kendraIndexId: findOutputValue('KendraIndexId'),
            cloudFrontWebUrl: findOutputValue('CloudFrontWebUrl'),
            cloudwatchDashboardUrl: findOutputValue('CloudwatchDashboardUrl'),
            providerApiKeySecret: findParameterValue('ProviderApiKeySecret')
        };
    };
}
