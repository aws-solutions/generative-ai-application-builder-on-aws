// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { agentMemoryParams } from '../../../../../../lib/api/model-schema/shared/agent-memory-params';
import { checkValidationSucceeded, checkValidationFailed } from '../../../shared/utils';

describe('Testing Agent Memory Parameters schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = agentMemoryParams;
        validator = new Validator();
    });

    describe('Valid Agent Memory Configurations', () => {
        it('should validate empty memory config', () => {
            const payload = {};
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate memory config with LongTermEnabled true', () => {
            const payload = {
                LongTermEnabled: true
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate memory config with LongTermEnabled false', () => {
            const payload = {
                LongTermEnabled: false
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Invalid Agent Memory Configurations', () => {
        it('should fail validation with non-boolean LongTermEnabled', () => {
            const payload = {
                LongTermEnabled: 'true'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties', () => {
            const payload = {
                LongTermEnabled: true,
                extraProperty: 'not-allowed'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
