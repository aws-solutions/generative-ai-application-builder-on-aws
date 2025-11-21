// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { filesGetResponseSchema } from '../../../../lib/api/model-schema/multimodal/files-get-response-body';
import { checkValidationSucceeded, checkValidationFailed } from '../shared/utils';
import { Validator } from 'jsonschema';

describe('Testing Multimodal Files Get Response API schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = filesGetResponseSchema;
        validator = new Validator();
    });

    describe('Valid Payloads', () => {
        const validPayloads = [
            {
                name: 'minimal valid get response',
                payload: {
                    downloadUrl: 'https://s3.amazonaws.com/bucket/presigned-url'
                }
            },
            {
                name: 'valid response with complex URL',
                payload: {
                    downloadUrl: 'https://s3.amazonaws.com/bucket/presigned-url?param=value&encoded=%20space'
                }
            },
            {
                name: 'valid response with long URL',
                payload: {
                    downloadUrl: 'https://s3.amazonaws.com/bucket/very/long/path/to/file/presentation.html'
                }
            }
        ];

        test.each(validPayloads)('$name succeeds', ({ payload }) => {
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Required Fields Validations', () => {
        const missingFieldTests = [
            {
                name: 'missing downloadUrl',
                payload: {}
            },
            {
                name: 'empty payload',
                payload: {}
            }
        ];

        test.each(missingFieldTests)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Download URL Validations', () => {
        const validDownloadUrls = [
            { name: 'simple S3 URL', url: 'https://s3.amazonaws.com/bucket' },
            { name: 'URL with encoded characters', url: 'https://s3.amazonaws.com/bucket/my%20file.jpg' }
        ];

        test.each(validDownloadUrls)('$name succeeds', ({ url }) => {
            const payload = {
                downloadUrl: url
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidDownloadUrls = [
            { name: 'empty URL', url: '' },
            { name: 'null URL', url: null },
            { name: 'non-string URL', url: 123 },
            { name: 'invalid URL format', url: 'not-a-url' }
        ];

        test.each(invalidDownloadUrls)('$name fails', ({ url }) => {
            const payload = {
                downloadUrl: url
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Download URL Format Validations', () => {
        const urlFormatTests = [
            {
                name: 'valid S3 URL with query params',
                url: 'https://s3.amazonaws.com/bucket/file?param=value',
                shouldSucceed: true
            },
            {
                name: 'valid S3 URL with encoded characters',
                url: 'https://s3.amazonaws.com/bucket/my%20file.jpg',
                shouldSucceed: true
            },
            { name: 'invalid URL format', url: 'not-a-valid-url', shouldSucceed: false },
            { name: 'empty URL', url: '', shouldSucceed: false }
        ];

        test.each(urlFormatTests)('$name', ({ url, shouldSucceed }) => {
            const payload = {
                downloadUrl: url
            };
            const result = validator.validate(payload, schema);
            if (shouldSucceed) {
                checkValidationSucceeded(result);
            } else {
                checkValidationFailed(result);
            }
        });
    });

    describe('Edge Cases and Combinations', () => {
        const edgeCases = [
            {
                name: 'minimal valid response',
                payload: {
                    downloadUrl: 'https://s3.amazonaws.com/b/f.png'
                },
                shouldSucceed: true
            },
            {
                name: 'maximum length URL',
                payload: {
                    downloadUrl: 'https://s3.amazonaws.com/bucket/' + 'a'.repeat(1000) + '.jpg'
                },
                shouldSucceed: true
            },
            {
                name: 'special characters in URL',
                payload: {
                    downloadUrl: 'https://s3.amazonaws.com/bucket/my%20file%20(1).jpg?param=value&encoded=%20space'
                },
                shouldSucceed: true
            }
        ];

        test.each(edgeCases)('$name', ({ payload, shouldSucceed }) => {
            const result = validator.validate(payload, schema);
            if (shouldSucceed) {
                checkValidationSucceeded(result);
            } else {
                checkValidationFailed(result);
            }
        });
    });

    describe('Additional Properties and Type Validations', () => {
        const invalidCases = [
            {
                name: 'additional properties in root',
                payload: {
                    downloadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
                    extraField: 'not allowed'
                }
            },
            {
                name: 'wrong type for downloadUrl',
                payload: {
                    downloadUrl: 123
                }
            },
            {
                name: 'null downloadUrl',
                payload: {
                    downloadUrl: null
                }
            },
            {
                name: 'array instead of object',
                payload: ['https://s3.amazonaws.com/bucket/presigned-url']
            },
            {
                name: 'string instead of object',
                payload: 'not an object'
            },
            {
                name: 'number instead of object',
                payload: 123
            }
        ];

        test.each(invalidCases)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
