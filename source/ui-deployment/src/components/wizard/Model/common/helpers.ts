// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SelectProps } from '@cloudscape-design/components';
import { SupportedModelOptions } from '../helpers';

const FIRST_PARTY_PROVIDERS = ['bedrock', 'sagemaker'];

export const formatModelProviderOptionsList = (modelProviders: string[], excludedProviders: string[] = []) => {
    if (!modelProviders) {
        return [{} as SelectProps.Option];
    }

    const modelProviderOptionsMap: SupportedModelOptions = {};

    modelProviders
        .filter((modelProvider) => {
            return !excludedProviders.includes(modelProvider.toLowerCase());
        })
        .forEach((modelProvider) => {
            if (FIRST_PARTY_PROVIDERS.includes(modelProvider.toLowerCase())) {
                if (!modelProviderOptionsMap['firstParty']) {
                    modelProviderOptionsMap['firstParty'] = { label: 'Amazon', options: [] };
                }
                modelProviderOptionsMap['firstParty'].options.push({
                    label: modelProvider,
                    value: modelProvider
                });
            } else {
                if (!modelProviderOptionsMap['thirdParty']) {
                    modelProviderOptionsMap['thirdParty'] = { label: 'Third Party', options: [] };
                }
                modelProviderOptionsMap['thirdParty'].options.push({
                    label: modelProvider,
                    value: modelProvider
                });
            }
        });

    return Object.values(modelProviderOptionsMap).sort((a, b) => {
        return a.label.localeCompare(b.label);
    });
};
