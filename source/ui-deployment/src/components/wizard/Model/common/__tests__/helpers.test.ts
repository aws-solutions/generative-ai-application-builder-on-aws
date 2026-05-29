// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { formatModelProviderOptionsList } from '../helpers';

describe('formatModelProviderOptionsList', () => {
    test('groups first-party providers under Amazon', () => {
        const providers = ['Bedrock', 'SageMaker'];
        const result = formatModelProviderOptionsList(providers);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Amazon');
        expect(result[0].options).toHaveLength(2);
    });

    test('groups third-party providers under Third Party', () => {
        const providers = ['OpenAI', 'Anthropic'];
        const result = formatModelProviderOptionsList(providers);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Third Party');
        expect(result[0].options).toHaveLength(2);
    });

    test('separates first-party and third-party providers', () => {
        const providers = ['Bedrock', 'OpenAI', 'SageMaker'];
        const result = formatModelProviderOptionsList(providers);
        expect(result).toHaveLength(2);
        const amazonGroup = result.find((g) => g.label === 'Amazon');
        const thirdPartyGroup = result.find((g) => g.label === 'Third Party');
        expect(amazonGroup!.options).toHaveLength(2);
        expect(thirdPartyGroup!.options).toHaveLength(1);
    });

    test('excludes specified providers', () => {
        const providers = ['Bedrock', 'SageMaker', 'OpenAI'];
        const result = formatModelProviderOptionsList(providers, ['sagemaker']);
        const allOptions = result.flatMap((g) => g.options);
        expect(allOptions.find((o) => o.value === 'SageMaker')).toBeUndefined();
    });

    test('returns empty option for null input', () => {
        const result = formatModelProviderOptionsList(null as any);
        expect(result).toEqual([{}]);
    });

    test('sorts groups alphabetically', () => {
        const providers = ['OpenAI', 'Bedrock'];
        const result = formatModelProviderOptionsList(providers);
        expect(result[0].label).toBe('Amazon');
        expect(result[1].label).toBe('Third Party');
    });

    test('handles empty array', () => {
        const result = formatModelProviderOptionsList([]);
        expect(result).toEqual([]);
    });
});
