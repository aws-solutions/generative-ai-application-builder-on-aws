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

import React from 'react';
import { FormField, Select, SelectProps } from '@cloudscape-design/components';
import { TOOLS_CONTENT } from '../../tools-content';
import { InfoLink } from '../../../commons/common-components';

import { ModelNameOption } from '../../interfaces';
import { formatModelNamesList } from '../helpers';
import { DropdownStatusProps } from '@cloudscape-design/components/internal/components/dropdown-status';
import { useModelNameQuery } from 'hooks/useQueries';

export interface ModelNameDropdownProps {
    modelData: any;
    modelNameFormLabel?: string;
    modelNameFormDescription?: string;
    onChangeFn: (e: any) => void;
    setHelpPanelContent?: (e: any) => void;
}

const { model: modelToolsContent } = TOOLS_CONTENT;

export const ModelNameDropdown = (props: ModelNameDropdownProps) => {
    const [options, setOptions] = React.useState<SelectProps.Option[]>([]);
    const [status, setStatus] = React.useState<DropdownStatusProps.StatusType>('pending');

    const providerName = props.modelData.modelProvider.value;
    const { isPending, isError, data, error } = useModelNameQuery(providerName);

    const [modelNameSelectedOption, setModelNameSelectedOption] = React.useState(() => {
        // preserve modelname in form on edit
        return props.modelData.modelName !== ''
            ? ({ label: props.modelData.modelName, value: props.modelData.modelName } as ModelNameOption)
            : null;
    });

    const onModelNameChange = (detail: SelectProps.ChangeDetail) => {
        setModelNameSelectedOption(detail.selectedOption);
        if (props.modelData.modelName !== detail.selectedOption.value) {
            props.onChangeFn({ modelName: detail.selectedOption.value });
        }
    };

    const handleLoadItems = async () => {
        try {
            if (isPending) {
                setStatus('loading');
                setOptions([]);
            } else if (isError) {
                throw error;
            } else {
                const options = formatModelNamesList(data as string[], providerName);
                setOptions(options);
                setStatus('finished');
            }
        } catch (error) {
            setStatus('error');
        }
    };

    React.useEffect(() => {
        handleLoadItems();
    }, [data]);

    React.useEffect(() => {
        if (props.modelData.modelName === null) {
            setModelNameSelectedOption(null);
        }
    }, [props.modelData.modelName]);

    React.useEffect(() => {
        if (props.modelData.modelName === '') {
            setModelNameSelectedOption(null);
        }
    }, [props.modelData.modelProvider]);

    const isDisabled = props.modelData.modelProvider === '';

    return (
        <FormField
            label={props.modelNameFormLabel ?? 'Model name*'}
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(modelToolsContent.modelName)}
                    ariaLabel={'Information about model name.'}
                />
            }
            description={
                props.modelNameFormDescription ??
                'Select the name of the model from the model provider to use for this deployment.'
            }
            data-testid="model-name-dropdown"
        >
            <Select
                selectedAriaLabel="Selected"
                placeholder="select model..."
                options={options}
                onChange={({ detail }) => onModelNameChange(detail)}
                selectedOption={modelNameSelectedOption}
                disabled={isDisabled}
                data-testid="model-name-dropdown-select"
                loadingText="fetching models name..."
                onLoadItems={handleLoadItems}
                statusType={status}
                errorText="Error fetching model names"
            />
        </FormField>
    );
};
