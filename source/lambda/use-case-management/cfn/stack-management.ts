// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MetricUnit } from '@aws-lambda-powertools/metrics';
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
import { parse, validate } from '@aws-sdk/util-arn-parser';
import { customAwsConfig } from 'aws-node-user-agent-config';
import { StackInfo, UseCaseRecord } from '../model/list-use-cases';
import { UseCase } from '../model/use-case';
import { logger, metrics, tracer } from '../power-tools-init';
import { CfnOutputKeys, CfnParameterKeys, CloudWatchMetrics } from '../utils/constants';
import {
    CreateStackCommandInputBuilder,
    DeleteStackCommandInputBuilder,
    UpdateStackCommandInputBuilder
} from './stack-operation-builder';
import { DescribeStacksCommandInputBuilder } from './stack-view-builder';

export interface UseCaseStackDetails {
    status: string | undefined;
    webConfigKey: string | undefined;
    cloudFrontWebUrl: string | undefined;
    defaultUserEmail: string | undefined;
    knowledgeBaseType: string | undefined;
    bedrockKnowledgeBaseId: string | undefined;
    kendraIndexId: string | undefined;
    cloudwatchDashboardUrl: string | undefined;
    useCaseUUID: string | undefined;
    ragEnabled: string | undefined;
    deployUI: string | undefined;
    vpcEnabled: string | undefined;
    createNewVpc: string | undefined;
    vpcId: string | undefined;
    privateSubnetIds: string[] | undefined;
    securityGroupIds: string[] | undefined;
}

/**
 * Class to manage use case stacks
 */
export class StackManagement {
    private cfnClient: CloudFormationClient;

    constructor() {
        this.cfnClient = new CloudFormationClient(customAwsConfig());
        tracer.captureAWSv3Client(this.cfnClient);
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
            metrics.addMetric(CloudWatchMetrics.UC_INITIATION_SUCCESS, MetricUnit.Count, 1);
            logger.debug(`StackId: ${response.StackId}`);
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.UC_INITIATION_FAILURE, MetricUnit.Count, 1);
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
    public async updateStack(useCase: UseCase, roleArn: string | undefined): Promise<string> {
        const builder = new UpdateStackCommandInputBuilder(useCase);
        builder.setRoleArn(roleArn);

        const input = await builder.build(); //NOSONAR - removing await, input is empty
        const command = new UpdateStackCommand(input);

        let response: UpdateStackCommandOutput;
        try {
            response = await this.cfnClient.send(command);
            metrics.addMetric(CloudWatchMetrics.UC_UPDATE_SUCCESS, MetricUnit.Count, 1);
            logger.debug(`StackId: ${response.StackId}`);
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.UC_UPDATE_FAILURE, MetricUnit.Count, 1);
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
    public async deleteStack(useCase: UseCase, roleArn: string | undefined): Promise<void> {
        const builder = new DeleteStackCommandInputBuilder(useCase);
        builder.setRoleArn(roleArn);
        const input = await builder.build(); //NOSONAR - removing await, input is empty
        const command = new DeleteStackCommand(input);
        let response: DeleteStackCommandOutput;
        try {
            response = await this.cfnClient.send(command);
            metrics.addMetric(CloudWatchMetrics.UC_DELETION_SUCCESS, MetricUnit.Count, 1);
            logger.debug(`StackId: ${response}`);
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.UC_DELETION_FAILURE, MetricUnit.Count, 1);
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
    public async getStackDetailsFromUseCaseRecord(useCaseRecord: UseCaseRecord): Promise<UseCaseStackDetails> {
        return await this.getStackDetails(this.createStackInfoFromDdbRecord(useCaseRecord));
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
            metrics.addMetric(CloudWatchMetrics.UC_DESCRIBE_SUCCESS, MetricUnit.Count, 1);

            // extra error handling to ensure we only get the first stack
            if (response.Stacks!.length > 1) {
                throw new Error('More than one stack returned');
            }
            return StackManagement.parseStackDetails(response.Stacks![0]);
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.UC_DESCRIBE_FAILURE, MetricUnit.Count, 1);
            logger.error(`Error occurred when describing stack, error is ${error}`);
            throw error;
        } finally {
            metrics.publishStoredMetrics();
        }
    }

    /**
     * Retrieves the role ARN associated with a CloudFormation stack if it exists.
     *
     * @param useCaseRecord - The UseCaseRecord object containing information about the stack.
     * @returns A Promise that resolves to the role ARN as a string if it exists, or undefined if it doesn't.
     * @throws An error if there is an issue describing the stack.
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###getStackRoleArnIfExists' })
    public async getStackRoleArnIfExists(useCaseRecord: UseCaseRecord): Promise<string | undefined> {
        const stackInfo = this.createStackInfoFromDdbRecord(useCaseRecord);
        const describeStackCommand = new DescribeStacksCommand(
            await new DescribeStacksCommandInputBuilder(stackInfo).build()
        );
        try {
            const describeStackResponse = await this.cfnClient.send(describeStackCommand);
            const roleArn = describeStackResponse.Stacks![0].RoleARN;

            if (!roleArn) {
                return undefined;
            }
            return roleArn;
        } catch (error) {
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

        const findListOutputValue = (key: string): string[] | undefined => {
            return findOutputValue(key)?.split(',');
        };

        return {
            status: stackDetails.StackStatus,
            defaultUserEmail: findParameterValue(CfnParameterKeys.DefaultUserEmail),
            useCaseUUID: findParameterValue(CfnParameterKeys.UseCaseUUID),
            ragEnabled: findParameterValue(CfnParameterKeys.RAGEnabled),
            deployUI: findParameterValue(CfnParameterKeys.DeployUI),
            webConfigKey: findOutputValue(CfnOutputKeys.WebConfigKey),
            knowledgeBaseType: findParameterValue(CfnParameterKeys.KnowledgeBaseType),
            kendraIndexId: findOutputValue(CfnOutputKeys.KendraIndexId),
            bedrockKnowledgeBaseId: findParameterValue(CfnParameterKeys.BedrockKnowledgeBaseId),
            cloudFrontWebUrl: findOutputValue(CfnOutputKeys.CloudFrontWebUrl),
            cloudwatchDashboardUrl: findOutputValue(CfnOutputKeys.CloudwatchDashboardUrl),
            vpcEnabled: findParameterValue(CfnParameterKeys.VpcEnabled),
            createNewVpc: findParameterValue(CfnParameterKeys.CreateNewVpc),
            vpcId: findOutputValue(CfnOutputKeys.VpcId),
            privateSubnetIds: findListOutputValue(CfnOutputKeys.PrivateSubnetIds),
            securityGroupIds: findListOutputValue(CfnOutputKeys.SecurityGroupIds)
        };
    };

    /**
     *
     * @param useCaseRecord Use case record object created from DDB record
     * @returns
     */
    private createStackInfoFromDdbRecord = (useCaseRecord: UseCaseRecord): StackInfo => {
        console.debug(`useCaseRecord: ${JSON.stringify(useCaseRecord)}`);
        if (!validate(useCaseRecord.StackId)) {
            throw new Error(`Invalid stackId ARN provided in DDB record: ${useCaseRecord.StackId}`);
        }
        const parsedArn = parse(useCaseRecord.StackId);

        // parsedArn.resource has the form `stack/stack-name/unique-id`
        // `stack/` has to be removed from the resource to get the valid stack name

        return {
            stackArn: useCaseRecord.StackId,
            stackId: parsedArn.resource.replace('stack/', ''),
            stackInstanceAccount: parsedArn.accountId,
            stackInstanceRegion: parsedArn.region
        } as StackInfo;
    };
}
