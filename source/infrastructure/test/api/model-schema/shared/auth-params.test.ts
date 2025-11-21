// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { checkValidationSucceeded, checkValidationFailed } from './utils';
import { USE_CASE_TYPES, AUTHENTICATION_PROVIDERS, BEDROCK_INFERENCE_TYPES, CHAT_PROVIDERS } from '../../../../lib/utils/constants';
import { deployUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/deploy-usecase-body';
import { updateUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/update-usecase-body';

describe('Testing AuthParams schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        validator = new Validator();
    });

    describe('AuthenticationParams Creation Validation', () => {

        beforeAll(() => {
            schema = deployUseCaseBodySchema;
        });

        describe('User Pool Id provided', () => {
            it('Valid User Pool Id provided', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        }
                    },
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {
                            ExistingUserPoolId: 'us-east-1_111111111111'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Valid Pool Client Id provided', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        }
                    },
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {
                            ExistingUserPoolId: 'us-east-1_111111111111',
                            ExistingUserPoolClientId: '1111111111111111111111111111'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });
        });

        describe('Invalid Input provided', () => {
            it('Empty Authentication Params', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel'
                        }
                    },
                    AuthenticationParams: {}
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Unsupported Authentication Provider', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel'
                        }
                    },
                    AuthenticationParams: {
                        AuthenticationProvider: 'unsupported'
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Invalid User Pool Id provided', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel'
                        }
                    },
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {
                            ExistingUserPoolId: 'invalid user pool'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('No CognitoParams provided', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel'
                        }
                    },
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('No User Pool provided', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel'
                        }
                    },
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {}
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });
    });

    describe('AuthenticationParams Update Validation', () => {

        beforeAll(() => {
            schema = updateUseCaseBodySchema;
        });

        describe('User Pool Id provided', () => {
            it('Valid User Pool Id provided', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {
                            ExistingUserPoolId: 'us-east-1_111111111111'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Valid Pool Client Id provided', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {
                            ExistingUserPoolId: 'us-east-1_111111111111',
                            ExistingUserPoolClientId: '1111111111111111111111111111'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });
        });

        describe('Invalid Input provided', () => {
            it('Empty Authentication Params', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {}
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Unsupported Authentication Provider', () => {
                const payload = {
                    AuthenticationParams: {
                        UseCaseType: USE_CASE_TYPES.TEXT,
                        AuthenticationProvider: 'unsupported'
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Invalid User Pool Id provided', () => {
                const payload = {
                    AuthenticationParams: {
                        UseCaseType: USE_CASE_TYPES.TEXT,
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {
                            ExistingUserPoolId: 'invalid user pool'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('No CognitoParams provided', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('No User Pool provided', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {}
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });
    });
});