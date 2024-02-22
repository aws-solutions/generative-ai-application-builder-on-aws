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
import {
    TextContent,
    AttributeEditor,
    AttributeEditorProps,
    SpaceBetween,
    Header,
    Container
} from '@cloudscape-design/components';

import InputControl from './InputControl';
import SelectionControl from './SelectionControl';

export interface ModelParams {
    [key: string]: any;
}

export interface AdvancedModelSettingsProps {
    model: ModelParams;
    onChange: (model: any) => void;
}

interface ModelParamsEditorDefinition {
    label: string;
    control: (item: any, itemIndex: number) => React.JSX.Element;
}

interface ModelParamsEditorProps {
    items: any[];
    setItems: React.Dispatch<any>;
}

const GenerateModelParameterTypeInstructions = (type: string) => {
    let instructions = '';
    // eslint-disable-next-line default-case
    switch (type) {
        case 'boolean':
            instructions = 'Case insensitive. Please input either true/false or yes/no';
            break;
        case 'list':
            instructions = 'Please ensure it is a comma-separated list and a valid JSON string.';
            break;
        case 'dictionary':
            instructions = 'Please ensure it is a valid JSON string.';
            break;
    }

    if (instructions.length > 0) {
        return (
            <TextContent>
                <p>
                    <small>{instructions}</small>
                </p>
            </TextContent>
        );
    }
};

const createModelParamsEditorDefinition = ({
    items,
    setItems
}: ModelParamsEditorProps): ModelParamsEditorDefinition[] => {
    return [
        {
            label: 'Key',
            control: ({ key = '' }, itemIndex: number) => (
                <InputControl
                    prop="key"
                    value={key}
                    index={itemIndex}
                    placeholder="Enter key"
                    setItems={setItems}
                    items={items}
                    data-testid="model-param-editor-input-key"
                />
            )
        },
        {
            label: 'Value',
            control: ({ value = '' }, itemIndex: number) => (
                <div>
                    <InputControl
                        prop="value"
                        value={value}
                        index={itemIndex}
                        placeholder="Enter value"
                        setItems={setItems}
                        items={items}
                        data-testid="model-param-editor-input-value"
                    />
                    {GenerateModelParameterTypeInstructions(
                        items[itemIndex]?.type?.value ? items[itemIndex]?.type?.value : 'undefined'
                    )}
                </div>
            )
        },
        {
            label: 'Type',
            control: (_item: any, itemIndex: number) => (
                <SelectionControl
                    index={itemIndex}
                    items={items}
                    setItems={setItems}
                    placeholder="Select parameter data type"
                    prop="type"
                    data-testid="model-param-editor-select-type"
                />
            )
        }
    ];
};

export const AdvancedModelSettings = ({ model, onChange }: AdvancedModelSettingsProps) => {
    const [items, setItems] = React.useState(model.modelParameters);

    const handleAddParam = () => {
        setItems([...items, {}]);
    };

    const handleRemoveParam = (detail: AttributeEditorProps.RemoveButtonClickDetail) => {
        const tmpItems = [...items];
        tmpItems.splice(detail.itemIndex, 1);
        setItems(tmpItems);
    };

    React.useEffect(() => {
        onChange({ modelParameters: items });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    return (
        <Container
            header={<Header variant="h2">Advanced model parameters</Header>}
            data-testid="advanced-settings-container"
        >
            <SpaceBetween size="l">
                <div>
                    <TextContent>
                        <p>
                            Model parameters are passed to the model as they are inputted. Please consult the model
                            documentation to know what parameters the model accepts
                        </p>
                    </TextContent>
                </div>
                <AttributeEditor
                    onAddButtonClick={handleAddParam}
                    onRemoveButtonClick={({ detail }) => handleRemoveParam(detail)}
                    removeButtonText="Remove"
                    items={items}
                    addButtonText="Add new item"
                    definition={createModelParamsEditorDefinition({ items, setItems })}
                    data-testid="advanced-model-params-editor"
                />
            </SpaceBetween>
        </Container>
    );
};

export default AdvancedModelSettings;
