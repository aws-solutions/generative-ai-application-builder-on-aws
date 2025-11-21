// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import _ from 'lodash';
import { AUTHENTICATION_PROVIDERS, CfnParameterKeys } from '../../utils/constants';
import { tracer } from '../../power-tools-init';
import { UseCase } from '../use-case';
import { AgentUseCaseConfiguration } from '../types';
import { UseCaseValidator } from './base-validator';
import { getCognitoDomainPrefixByUserPool } from './validation-utils';

/**
 * Validator for Agent use cases (Bedrock Agents).
 * Handles validation of agent-specific parameters and authentication settings.
 */
export class AgentUseCaseValidator extends UseCaseValidator<AgentUseCaseConfiguration> {
    /**
     * Validates a new agent use case.
     * Primarily handles authentication configuration for agent deployments.
     *
     * @param useCase - The agent use case to validate
     * @returns A promise that resolves to the validated use case
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateNewAgentUseCase' })
    public async validateNewUseCase(useCase: UseCase): Promise<UseCase> {
        const config = this.getTypedConfiguration(useCase);

        if (config.AuthenticationParams) {
            // prettier-ignore
            switch (config.AuthenticationParams.AuthenticationProvider) { //NOSONAR - typescript:S1301, switch statement used for ease of future extensions
                case AUTHENTICATION_PROVIDERS.COGNITO:
                    // overriding the previously set CognitoDomainPrefix parameter
                    // by fetching it dynamically based on the set user pool

                    const existingUserPoolId = useCase.cfnParameters?.get(CfnParameterKeys.ExistingCognitoUserPoolId);
                    if (!existingUserPoolId) {
                        throw new Error('Undefined user pool provided for the cognito authentication provider.');
                    }

                    const cognitoDomainPrefix = await getCognitoDomainPrefixByUserPool(existingUserPoolId);

                    if (!useCase.cfnParameters) {
                        throw new Error('CfnParameters are not available yet for setting Cognito Domain Prefix.');
                    }

                    useCase.cfnParameters.set(CfnParameterKeys.CognitoDomainPrefix, cognitoDomainPrefix);
                    break;
            }
        }
        return useCase;
    }

    /**
     * Validates an updated agent use case.
     * Merges existing configuration with new configuration for agent updates.
     *
     * @param useCase - The agent use case to validate
     * @param oldDynamoDbRecordKey - The key of the old DynamoDB record
     * @returns A promise that resolves to the validated use case
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateUpdateAgentUseCase' })
    public async validateUpdateUseCase(useCase: UseCase, oldDynamoDbRecordKey: string): Promise<UseCase> {
        // retrieve the existing config from DynamoDB using a dummy use case object
        let dummyOldUseCase = useCase.clone();
        dummyOldUseCase.setUseCaseConfigRecordKey(oldDynamoDbRecordKey);
        const existingConfigObj = await this.useCaseConfigMgmt.getUseCaseConfigFromTable(dummyOldUseCase);
        useCase.configuration = _.merge(existingConfigObj, useCase.configuration);

        return useCase;
    }
}
