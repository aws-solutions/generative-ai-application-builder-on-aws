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

import { FormField, Spinner, Toggle, ToggleProps } from '@cloudscape-design/components';
import { BaseToggleComponentProps, ModelProviderOption } from '../../interfaces';

import { useModelStreamingQuery } from '../../../../hooks/useQueries';

export interface StreamingToggleProps extends BaseToggleComponentProps {
    modelData: any;
    modelProvider: ModelProviderOption;
    modelName: string;
}

export const StreamingToggle = (props: StreamingToggleProps) => {
    const modelProviderValue = props.modelProvider.value!;
    const modelNameValue = props.modelName;

    const modelStreamingQueryResponse = useModelStreamingQuery(modelProviderValue, modelNameValue);

    const [toggleChecked, setToggleChecked] = React.useState(false);
    const [isDisabled, setIsDisabled] = React.useState(() => {
        if (modelStreamingQueryResponse.isError) {
            console.error('Error in fetching model streaming defaults');
            return true;
        }

        if (modelStreamingQueryResponse.isSuccess) {
            return !modelStreamingQueryResponse.data;
        }

        return true; // default to disabled until data is fetched. This is to prevent flickering.
    });

    const onStreamingChange = (detail: ToggleProps.ChangeDetail) => {
        props.onChangeFn({ 'streaming': detail.checked });
        setToggleChecked(detail.checked);
    };

    React.useEffect(() => {
        if (modelStreamingQueryResponse.isError) {
            console.error('Error in fetching model streaming defaults');
        }

        if (modelStreamingQueryResponse.isSuccess) {
            const isStreaming = modelStreamingQueryResponse.data;

            setToggleChecked(isStreaming);
            props.onChangeFn({ 'streaming': isStreaming });
            setIsDisabled(!isStreaming);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.modelProvider, props.modelName, modelStreamingQueryResponse.data]);

    return (
        <FormField
            label="Streaming"
            description="If enabled, the response from the model will be streamed"
            data-testid="model-streaming-field"
        >
            {modelStreamingQueryResponse.isPending ? (
                <Spinner />
            ) : (
                <Toggle
                    onChange={({ detail }) => onStreamingChange(detail)}
                    checked={toggleChecked}
                    disabled={isDisabled}
                    data-testid="model-streaming-toggle"
                />
            )}
        </FormField>
    );
};
