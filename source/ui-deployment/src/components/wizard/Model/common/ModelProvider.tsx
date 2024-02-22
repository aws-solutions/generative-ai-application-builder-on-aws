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

import { FormField, Select, SelectProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import { TOOLS_CONTENT } from '../../tools-content';

import React from 'react';
import HomeContext from '../../../../contexts';
import { InfoLink } from '../../../commons';
import { DEPLOYMENT_ACTIONS } from '../../../../utils/constants';
import { DropdownStatusProps } from '@cloudscape-design/components/internal/components/dropdown-status';
import { useModelProvidersQuery } from 'hooks/useQueries';
import { formatModelProviderOptionsList } from './helpers';
import { DEFAULT_STEP_INFO } from '../../steps-config';

const { model: modelToolsContent } = TOOLS_CONTENT;

export interface ModelProviderDropdownProps extends BaseFormComponentProps {
    modelData: any;
}

export const ModelProviderDropdown = (props: ModelProviderDropdownProps) => {
    const {
        state: { deploymentAction }
    } = React.useContext(HomeContext);

    const [modelProviderOptions, setModelProviderOptions] = React.useState<SelectProps.Option[]>([]);

    const [selectedModelProviderOption, setSelectedModelProviderOption] = React.useState<SelectProps.Option | null>(
        () => {
            if (props.modelData.modelProvider.value === '') {
                return null;
            }
            return { label: props.modelData.modelProvider.value, value: props.modelData.modelProvider.value };
        }
    );
    const [status, setStatus] = React.useState<DropdownStatusProps.StatusType>('loading');

    const modelProviderQueryResponse = useModelProvidersQuery();

    const onModelProviderChange = (detail: SelectProps.ChangeDetail) => {
        setSelectedModelProviderOption(detail.selectedOption);
        props.onChangeFn({
            modelProvider: detail.selectedOption,
            modelName: DEFAULT_STEP_INFO.model.modelName
        });
    };

    const handleLoadItems = async () => {
        try {
            if (modelProviderQueryResponse.isPending) {
                setStatus('loading');
                setModelProviderOptions([]);
            } else if (modelProviderQueryResponse.isError) {
                throw modelProviderQueryResponse.error;
            } else {
                const options = formatModelProviderOptionsList(modelProviderQueryResponse.data);
                setModelProviderOptions(options);
                setStatus('finished');
            }
        } catch (error) {
            setStatus('error');
            console.error(error);
        }
    };

    React.useEffect(() => {
        handleLoadItems();
    }, [modelProviderQueryResponse.data]);

    React.useEffect(() => {
        handleLoadItems();
    }, []);

    const isDisabled = deploymentAction === DEPLOYMENT_ACTIONS.EDIT;

    return (
        <FormField
            label="Model provider"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(modelToolsContent.modelProvider)}
                    ariaLabel={'Information about the model provider.'}
                />
            }
            description="Select the model provider you want to use."
            data-testid="model-provider-field"
        >
            <Select
                selectedAriaLabel="Selected"
                selectedOption={selectedModelProviderOption}
                placeholder="select model provider"
                options={modelProviderOptions}
                onChange={({ detail }) => onModelProviderChange(detail)}
                disabled={isDisabled}
                onLoadItems={handleLoadItems}
                statusType={status}
                errorText="Error fetching model providers"
                loadingText="Fetching model providers..."
            />
        </FormField>
    );
};
export default ModelProviderDropdown;
