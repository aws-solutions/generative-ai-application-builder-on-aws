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

import { SelectProps } from '@cloudscape-design/components';
import { SupportedModelOptions } from '../helpers';

const FIRST_PARTY_PROVIDERS = ['bedrock', 'sagemaker'];

export const formatModelProviderOptionsList = (modelProviders: string[]) => {
    if (!modelProviders) {
        return [{} as SelectProps.Option];
    }

    const modelProviderOptionsMap: SupportedModelOptions = {};

    modelProviders.forEach((modelProvider) => {
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
