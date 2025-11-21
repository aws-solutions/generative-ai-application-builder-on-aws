// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { feedbackRequestSchema } from '../../../../lib/api/model-schema/feedback/feedback-body';
import { checkValidationSucceeded, checkValidationFailed } from '../shared/utils';
import { Validator } from 'jsonschema';

describe('Testing Feedback API schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = feedbackRequestSchema;
        validator = new Validator();
    });

    describe('Required Fields Validations', () => {
        it('Test minimal valid feedback payload', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'positive'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Test missing required field fails', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321'
                // Missing feedback field
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test invalid useCaseRecordKey format fails', () => {
            const payload = {
                useCaseRecordKey: 'invalid-format',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'positive'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test invalid conversationId format fails', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: 'invalid-uuid-format',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'positive'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test invalid messageId format fails', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: 'invalid-uuid-format',
                feedback: 'positive'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Feedback Value Validations', () => {
        it('Test positive feedback succeeds', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'positive'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Test negative feedback succeeds', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'negative'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Test invalid feedback value fails', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'neutral'  // Not in FEEDBACK_VALUES
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Optional Fields Validations', () => {
        it('Test with rephrased query succeeds', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'positive',
                rephrasedQuery: 'What is the weather like today?'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Test with source documents succeeds', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'negative',
                sourceDocuments: [
                    's3://bucket/document1.pdf',
                    's3://bucket/document2.txt'
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Test with feedback reasons succeeds', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'negative',
                feedbackReason: ['Inaccurate', 'Other']
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Test with valid comment succeeds', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'negative',
                comment: 'The response was not helpful for my specific use case.'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Test with all optional fields succeeds', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'negative',
                rephrasedQuery: 'How do I configure AWS Lambda?',
                sourceDocuments: ['s3://bucket/lambda-guide.pdf'],
                feedbackReason: ['Inaccurate', 'Incomplete or insufficient'],
                comment: 'The response did not include information about environment variables.'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Test with invalid feedback reason fails', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'negative',
                feedbackReason: ['InvalidReason']  // Not in FEEDBACK_REASON_OPTIONS
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test with invalid comment characters fails', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'negative',
                comment: 'Invalid characters: @#$%^&*()'  // Contains invalid characters
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Additional Properties Validation', () => {
        it('Test with additional properties fails', () => {
            const payload = {
                useCaseRecordKey: 'abcd1234-efab5678',
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321',
                feedback: 'positive',
                extraField: 'not allowed'  // Additional property not allowed
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});