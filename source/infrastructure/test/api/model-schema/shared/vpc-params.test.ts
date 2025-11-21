// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { checkValidationSucceeded, checkValidationFailed } from './utils';
import { BEDROCK_INFERENCE_TYPES, CHAT_PROVIDERS, USE_CASE_TYPES } from '../../../../lib/utils/constants';
import { deployUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/deploy-usecase-body';
import { updateUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/update-usecase-body';
describe('Testing Vpc schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        validator = new Validator();
    });

    describe('VpcParams Creation validations', () => {
        
        beforeAll(() => {
            schema = deployUseCaseBodySchema;
        });

        const testVpcId = 'vpc-11111111';
        const testSubnetId = 'subnet-11111111';
        const testSgId = 'sg-11111111';

        it('No VPC succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    },
                },
                VpcParams: {
                    VpcEnabled: false
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('No VPC fails due to a mismatch of params', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: false,
                    CreateNewVpc: true
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Create a VPC succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { 
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                     }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: true
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Create a VPC fails due to extra params', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { 
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    },
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: true,
                    ExistingVpcId: testVpcId
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { 
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                     }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingPrivateSubnetIds: [testSubnetId],
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to missing VPC ID', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingPrivateSubnetIds: [testSubnetId],
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to bad VPC ID', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: 'garbage',
                    ExistingPrivateSubnetIds: [testSubnetId],
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to missing subnet IDs', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to bad subnet IDs', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingPrivateSubnetIds: ['garbage'],
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to missing security group IDs', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { 
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    },
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingPrivateSubnetIds: [testSubnetId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to bad security group IDs', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingPrivateSubnetIds: [testSubnetId],
                    ExistingSecurityGroupIds: ['garbage']
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });


    describe('VpcParams validations', () => {

        beforeAll(() => {
            schema = updateUseCaseBodySchema;
        });

        const testVpcId = 'vpc-11111111';
        const testSubnetId = 'subnet-11111111';
        const testSgId = 'sg-11111111';

        it('Updating subnets succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                VpcParams: {
                    ExistingPrivateSubnetIds: [testSubnetId]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Updating security groups succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                VpcParams: {
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Attempting to pass a VPC ID fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                VpcParams: {
                    ExistingVpcId: testVpcId
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});