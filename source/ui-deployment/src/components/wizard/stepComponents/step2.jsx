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
 *********************************************************************************************************************/

import React from 'react';
import {
    Box,
    ColumnLayout,
    Container,
    Header,
    ExpandableSection,
    FormField,
    SpaceBetween,
    Select,
    Input,
    Textarea,
    TextContent,
    Toggle,
    Alert,
    Checkbox,
    Form,
    AttributeEditor
} from '@cloudscape-design/components';
import { InfoLink } from '../../commons/common-components';
import {
    HF_INF_ENDPOINT_OPTION_IDX,
    BEDROCK_MODEL_OPTION_IDX,
    MODEL_FAMILY_PROVIDER_OPTIONS,
    BEDROCK_MODEL_PROVIDERS_WITH_STREAMING
} from '../steps-config';
import { TOOLS_CONTENT } from '../tools-content.jsx';
import { getFieldOnChange, stringListToSelectionOptions, updateNumFieldsInError } from '../utils';
import {
    MIN_API_KEY_LENGTH,
    MAX_API_KEY_LENGTH,
    MAX_PROMPT_TEMPLATE_LENGTH,
    LEGAL_DISCLAIMER,
    MODEL_PARAM_TYPES,
    SUPPORTED_FALCON_MODELS
} from '../../../utils/constants';
import HomeContext from '../../../home/home.context';

const { model: modelToolsContent } = TOOLS_CONTENT;

const getTemperatureRangeFromConfig = ({ runtimeConfig, modelProvider, modelName }) => {
    const modelProviderName =
        modelProvider === MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX]
            ? modelProvider.value.split('-')[0]
            : modelProvider.value;

    let modelProviderParams;

    if (modelProvider === MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX]) {
        if (modelName && modelName.value) {
            modelProviderParams =
                runtimeConfig.ModelProviders[modelProviderName].ModelFamilyParams[
                    modelName.value.substring(0, modelName.value.indexOf('.'))
                ];
        } else {
            return {
                minTemperature: 0,
                defaultTemperature: 0.5,
                maxTemperature: 1
            };
        }
    } else {
        modelProviderParams = runtimeConfig.ModelProviders[modelProviderName].ModelProviderParams;
    }

    return {
        minTemperature: modelProviderParams.MinTemperature,
        defaultTemperature: modelProviderParams.DefaultTemperature,
        maxTemperature: modelProviderParams.MaxTemperature
    };
};

const TemperatureInput = ({
    modelProvider,
    onTemperatureChange,
    model,
    temperatureError,
    runtimeConfig,
    modelName
}) => {
    const temperatureRange = getTemperatureRangeFromConfig({ runtimeConfig, modelProvider, modelName });
    const tempStep = temperatureRange.maxTemperature > 1 ? 1 : 0.1;
    return (
        <FormField
            label="Model temperature"
            description="This parameter regulates the randomness or creativity of the model's predictions. Use a temperature closer to 0 for analytical, deterministic or multiple choice queries. A higher temperature generates creative responses."
            constraintText={`Min: ${temperatureRange.minTemperature}, Max: ${temperatureRange.maxTemperature}.`}
            errorText={temperatureError}
            data-testid="model-temperature-field"
        >
            <Input
                type="number"
                step={tempStep}
                autoFocus
                onChange={({ detail }) =>
                    onTemperatureChange({
                        detail,
                        minTemperature: temperatureRange.minTemperature,
                        maxTemperature: temperatureRange.maxTemperature
                    })
                }
                value={model.temperature}
                autoComplete={false}
            />
        </FormField>
    );
};

const isResponseStreamingAvailable = ({ modelProvider, rumtimeConfig }) => {
    try {
        return rumtimeConfig.ModelProviders[modelProvider.value].AllowsStreaming === 'true' ? true : false;
    } catch (error) {
        return false;
    }
};

const ModelSelection = ({ model, onChange, setHelpPanelContent, setNumFieldsInError }) => {
    const {
        state: { runtimeConfig }
    } = React.useContext(HomeContext);

    const [apiKeyError, setApiKeyError] = React.useState('');
    const [temperatureError, setTemperatureError] = React.useState('');
    const [promptTemplateError, setPromptTemplateError] = React.useState('');
    const [inferenceEndpointError, setInferenceEndpointError] = React.useState('');
    const [showApiKeyCheckbox, setShowApiKeyCheckbox] = React.useState(false);
    const [hfInfEndpointModelSelection, setHfInfEndpointModelSelection] = React.useState({ label: '', value: '' });

    const [enableStreaming, setEnableStreaming] = React.useState(
        isResponseStreamingAvailable({ rumtimeConfig: runtimeConfig, modelProvider: model.modelProvider })
    );

    const onStreamingChange = getFieldOnChange('toggle', 'streaming', onChange);
    const onVerboseChange = getFieldOnChange('toggle', 'verbose', onChange);

    const onApiKeyChange = ({ detail }) => {
        onChange({ apiKey: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^[a-zA-Z0-9_+:-]{${MIN_API_KEY_LENGTH},${MAX_API_KEY_LENGTH}}$`)) {
            errors +=
                'Can only include alphanumeric characters, -, _, +, and : must be between ' +
                MIN_API_KEY_LENGTH +
                ' and ' +
                MAX_API_KEY_LENGTH +
                ' characters. ';
        }
        updateNumFieldsInError(errors, apiKeyError, setNumFieldsInError);
        setApiKeyError(errors);
    };

    const onPromptTemplateChange = ({ detail }) => {
        onChange({ promptTemplate: detail.value });
        let errors = '';
        if (detail.value !== '' && detail.value.length > MAX_PROMPT_TEMPLATE_LENGTH) {
            errors += `Prompt template can have a maximum of ${MAX_PROMPT_TEMPLATE_LENGTH} characters`;
        }
        updateNumFieldsInError(errors, promptTemplateError, setNumFieldsInError);
        setPromptTemplateError(errors);
    };

    const onTemperatureChange = ({ detail, maxTemperature, minTemperature }) => {
        onChange({ temperature: detail.value });
        let errors = '';
        if (detail.value.length > 0 && (isNaN(detail.value) || isNaN(parseFloat(detail.value)))) {
            errors += 'Can only include numbers and a decimal point. ';
        } else if (parseFloat(detail.value) < minTemperature || parseFloat(detail.value) > maxTemperature) {
            errors += `Must be between ${minTemperature} and ${maxTemperature}.`;
        }
        updateNumFieldsInError(errors, temperatureError, setNumFieldsInError);
        setTemperatureError(errors);
    };

    const onModelInferenceEndpointChange = ({ detail }) => {
        onChange({ inferenceEndpoint: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match('^(https://)([a-zA-Z0-9_+.-/-]{1,256})$')) {
            errors += ' Must be a valid https url';
        }
        updateNumFieldsInError(errors, inferenceEndpointError, setNumFieldsInError);
        setInferenceEndpointError(errors);
    };

    const getSupportedModelsFromConfig = ({ modelProvider }) => {
        const supportedModels = runtimeConfig.ModelProviders[modelProvider.value].SupportedModels;

        if (modelProvider === MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX]) {
            const supportedModelOptions = {};
            supportedModels.forEach((model) => {
                const label = model.split('.')[0];
                if (!supportedModelOptions[label]) {
                    supportedModelOptions[label] = { label, options: [] };
                }
                supportedModelOptions[label].options.push({ label: model, value: model });
            });
            return Object.values(supportedModelOptions);
        }

        return supportedModels.map((modelId) => {
            return {
                label: modelId,
                value: modelId
            };
        });
    };

    const [modelNameSelectedOption, setModelNameSelectedOption] = React.useState(() => {
        // preserve modelname in form on edit
        return model.modelName !== '' ? { label: model.modelName, value: model.modelName } : null;
    });

    const onModelNameChange = ({ detail }) => {
        setModelNameSelectedOption(detail.selectedOption);
        if (model.modelName !== detail.selectedOption.value) {
            onChange({ modelName: detail.selectedOption.value });
        }
    };

    const onModelProviderChange = ({ detail }) => {
        if (model.modelProvider !== detail.selectedOption) {
            if (detail.selectedOption !== MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX]) {
                const defaultModelName = getSupportedModelsFromConfig({ modelProvider: detail.selectedOption })[0];
                onChange({
                    modelProvider: detail.selectedOption,
                    modelName:
                        detail.selectedOption === MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX]
                            ? null
                            : defaultModelName.value,
                    apiKey: ''
                });
                setModelNameSelectedOption(
                    detail.selectedOption === MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX]
                        ? null
                        : defaultModelName
                );
            } else {
                onChange({
                    modelProvider: detail.selectedOption,
                    apiKey: ''
                });
            }
        }
    };

    // disable streaming toggle button if bedrock model provider doesn't support streaming
    React.useEffect(() => {
        if (model.modelName && model.modelProvider === MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX]) {
            const bedrockProvider = model.modelName.split('.')[0];

            if (BEDROCK_MODEL_PROVIDERS_WITH_STREAMING.includes(bedrockProvider) === false) {
                onStreamingChange({ detail: { checked: false } });
                setEnableStreaming(false);
                model.streaming = false;
            } else {
                onStreamingChange({ detail: { checked: true } });
                setEnableStreaming(true);
                model.streaming = true;
            }
        } else {
            const isStreaming = isResponseStreamingAvailable({
                rumtimeConfig: runtimeConfig,
                modelProvider: model.modelProvider
            });
            onStreamingChange({ detail: { checked: isStreaming } });
            setEnableStreaming(isStreaming);
            model.streaming = isStreaming;
        }
    }, [model.modelProvider, model.modelName]);

    React.useEffect(() => {
        if (model.modelName === '') {
            const defaultModelName = getSupportedModelsFromConfig({
                modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[0]
            })[0];
            onChange({
                modelName: defaultModelName.value
            });
        }
    }, [model.modelName, onChange]);

    return (
        <form>
            <Form>
                <Container
                    header={<Header variant="h2">Model selection</Header>}
                    footer={
                        <ExpandableSection
                            headerText="Additional settings"
                            variant="footer"
                            data-testid="step2-additional-settings-expandable"
                        >
                            <SpaceBetween size="l">
                                <TemperatureInput
                                    modelProvider={model.modelProvider}
                                    onTemperatureChange={onTemperatureChange}
                                    model={model}
                                    temperatureError={temperatureError}
                                    runtimeConfig={runtimeConfig}
                                    modelName={modelNameSelectedOption}
                                />
                                <ColumnLayout columns={2} variant="text-grid">
                                    <FormField
                                        label="Verbose"
                                        description="If enabled, additional logs will be written to Amazon CloudWatch."
                                        data-testid="model-verbose-field"
                                    >
                                        <Toggle onChange={onVerboseChange} checked={model.verbose} />
                                    </FormField>

                                    <FormField
                                        label="Streaming"
                                        description="If enabled, the response from the model will be streamed"
                                        data-testid="model-streaming-field"
                                    >
                                        <Toggle
                                            onChange={onStreamingChange}
                                            checked={model.streaming}
                                            disabled={!enableStreaming}
                                        />
                                    </FormField>
                                </ColumnLayout>

                                <FormField
                                    label="Prompt Template"
                                    info={
                                        <InfoLink
                                            onFollow={() => setHelpPanelContent(modelToolsContent.promptTemplate)}
                                            ariaLabel={'Information about system prompts.'}
                                        />
                                    }
                                    description="Optional: a custom prompt template to use for the deployment. Please refer to the info link to learn about prompt placeholders. 
                                    {history} and {input} are mandatory. You will also require {context} if you are using RAG."
                                    errorText={promptTemplateError}
                                    data-testid="model-system-prompt-field"
                                >
                                    <Textarea
                                        placeholder="Optional"
                                        value={model.promptTemplate}
                                        onChange={onPromptTemplateChange}
                                        rows={10}
                                    />
                                </FormField>
                            </SpaceBetween>
                        </ExpandableSection>
                    }
                >
                    <SpaceBetween size="l">
                        <FormField
                            label="Model provider"
                            info={
                                <InfoLink
                                    onFollow={() => setHelpPanelContent(modelToolsContent.modelProvider)}
                                    ariaLabel={'Information about the model provider.'}
                                />
                            }
                            description="Select the model provider you want to use."
                            data-testid="model-provider-field"
                        >
                            <Select
                                selectedAriaLabel="Selected"
                                selectedOption={model.modelProvider}
                                options={MODEL_FAMILY_PROVIDER_OPTIONS}
                                onChange={onModelProviderChange}
                            />

                            {model.modelProvider !== MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX] && (
                                <div>
                                    <br />

                                    <Alert statusIconAriaLabel="info" type="info">
                                        <Box variant="p">{LEGAL_DISCLAIMER}</Box>
                                    </Alert>
                                </div>
                            )}
                        </FormField>

                        {model.modelProvider !== MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX] && (
                            <FormField
                                label="Model name*"
                                info={
                                    <InfoLink
                                        onFollow={() => setHelpPanelContent(modelToolsContent.modelName)}
                                        ariaLabel={'Information about model name.'}
                                    />
                                }
                                description="Select the name of the model from the model provider to use for this deployment."
                                data-testid="model-name-dropdown"
                            >
                                <Select
                                    selectedAriaLabel="Selected"
                                    placeholder="select model..."
                                    options={getSupportedModelsFromConfig({ modelProvider: model.modelProvider })}
                                    onChange={onModelNameChange}
                                    selectedOption={modelNameSelectedOption}
                                    disabled={model.modelProvider === ''}
                                />
                            </FormField>
                        )}

                        {model.modelProvider === MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX] && (
                            <div>
                                <FormField
                                    label="Select the Model for the HuggingFace Inference Endpoint*"
                                    data-testid="hf-inf-endpoint-model-name-dropdown"
                                    info={
                                        <InfoLink
                                            onFollow={() => setHelpPanelContent(modelToolsContent.modelName)}
                                            ariaLabel={'Information about model name.'}
                                        />
                                    }
                                    description="Select which model you have deployed on your HuggingFace Inference Endpoint."
                                >
                                    <Select
                                        selectedAriaLabel="Selected"
                                        placeholder="select model..."
                                        options={stringListToSelectionOptions(SUPPORTED_FALCON_MODELS)}
                                        onChange={({ detail }) => {
                                            setHfInfEndpointModelSelection(detail.selectedOption);
                                            onModelNameChange({ detail });
                                        }}
                                        selectedOption={hfInfEndpointModelSelection}
                                    />
                                </FormField>

                                <br />

                                {hfInfEndpointModelSelection.value !== '' && (
                                    <FormField
                                        label="HuggingFace Inference Endpoint URL*"
                                        info={
                                            <InfoLink
                                                onFollow={() =>
                                                    setHelpPanelContent(modelToolsContent.inferenceEndpoint)
                                                }
                                                ariaLabel={'Information about Hugging Face inference endpoints.'}
                                            />
                                        }
                                        description={`Enter the HuggingFace Inference Endpoint URL for the ${hfInfEndpointModelSelection.value} model.`}
                                        constraintText="Must be a valid https:// url to an existing HuggingFace Inference Endpoint, which can be accessed with the provided API key."
                                        errorText={inferenceEndpointError}
                                        data-testid="model-name-field"
                                    >
                                        <Input
                                            placeholder="https://..."
                                            type={'url'}
                                            value={model.inferenceEndpoint}
                                            onChange={onModelInferenceEndpointChange}
                                            autoComplete={false}
                                        />
                                    </FormField>
                                )}
                            </div>
                        )}
                        {model.modelProvider !== MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX] && (
                            <FormField
                                label="API Key*"
                                info={
                                    <InfoLink
                                        onFollow={() => setHelpPanelContent(modelToolsContent.apiKey)}
                                        ariaLabel={'Information about api key.'}
                                    />
                                }
                                description="API key obtained from the model provider"
                                errorText={apiKeyError}
                                data-testid="model-api-key-field"
                            >
                                <SpaceBetween size="xxs">
                                    <Input
                                        placeholder="API Key"
                                        type={showApiKeyCheckbox ? 'text' : 'password'}
                                        value={model.apiKey}
                                        onChange={onApiKeyChange}
                                        autoComplete={true}
                                    />

                                    <Checkbox
                                        onChange={({ detail }) => setShowApiKeyCheckbox(detail.checked)}
                                        checked={showApiKeyCheckbox}
                                    >
                                        <Box variant="small">Show API Key</Box>
                                    </Checkbox>
                                </SpaceBetween>
                            </FormField>
                        )}
                    </SpaceBetween>
                </Container>
            </Form>
        </form>
    );
};

const InputControl = React.memo(({ value, index, placeholder, setItems, prop }) => {
    const handleValueChange = ({ detail }) => {
        setItems((items) => {
            const updatedItems = [...items];
            updatedItems[index] = {
                ...updatedItems[index],
                [prop]: detail.value
            };
            return updatedItems;
        });
    };
    return <Input value={value} placeholder={placeholder} onChange={handleValueChange} />;
});

const SelectionControl = React.memo(({ index, placeholder, setItems, prop, items }) => {
    const SELECTION_OPTIONS = MODEL_PARAM_TYPES.map((type) => ({ label: type, value: type }));

    const [selectOption, setSelectOption] = React.useState(items[index]?.type || '');

    const handleSelectionChange = ({ detail }) => {
        setSelectOption(detail.selectedOption);

        setItems((items) => {
            const updatedItems = [...items];
            updatedItems[index] = {
                ...updatedItems[index],
                [prop]: detail.selectedOption
            };
            return updatedItems;
        });
    };

    return (
        <Select
            selectedAriaLabel="Selected"
            selectedOption={selectOption}
            options={SELECTION_OPTIONS}
            onChange={handleSelectionChange}
            placeholder={placeholder}
        />
    );
});

const generateModelParameterTypeInstructions = (type) => {
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

const createModelParamsEditorDefinition = ({ items, setItems, onChange }) => {
    return [
        {
            label: 'Key',
            control: ({ key = '' }, itemIndex) => (
                <InputControl prop="key" value={key} index={itemIndex} placeholder="Enter key" setItems={setItems} />
            )
        },
        {
            label: 'Value',
            control: ({ value = '' }, itemIndex) => (
                <div>
                    <InputControl
                        prop="value"
                        value={value}
                        index={itemIndex}
                        placeholder="Enter value"
                        setItems={setItems}
                    />
                    {generateModelParameterTypeInstructions(
                        items[itemIndex]?.type?.value ? items[itemIndex]?.type?.value : 'undefined'
                    )}
                </div>
            )
        },
        {
            label: 'Type',
            control: (_item, itemIndex) => (
                <SelectionControl
                    index={itemIndex}
                    items={items}
                    setItems={setItems}
                    placeholder="Select parameter data type"
                    prop="type"
                    onChange={onChange}
                />
            )
        }
    ];
};

const AdvancedModelSettings = ({ model, onChange }) => {
    const [items, setItems] = React.useState(model.modelParameters);

    const handleAddParam = ({ detail }) => {
        setItems([...items, {}]);
    };

    const handleRemoveParam = ({ detail }) => {
        const tmpItems = [...items];
        tmpItems.splice(detail.itemIndex, 1);
        setItems(tmpItems);
    };

    React.useEffect(() => {
        onChange({ modelParameters: items });
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
                    onRemoveButtonClick={handleRemoveParam}
                    removeButtonText="Remove"
                    items={items}
                    addButtonText="Add new item"
                    definition={createModelParamsEditorDefinition({ items, setItems, onChange })}
                    data-testid="advanced-model-params-editor"
                />
            </SpaceBetween>
        </Container>
    );
};

const Model = ({ info: { model }, setHelpPanelContent, onChange }) => {
    const [numFieldsInError, setNumFieldsInError] = React.useState(0);

    const initRequiredFields = () => {
        try {
            if (model.modelProvider.label === MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX].label) {
                return ['apiKey', 'inferenceEndpoint'];
            } else if (model.modelProvider.label === MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX].label) {
                return ['modelName'];
            }
            return ['modelName', 'apiKey'];
        } catch (error) {
            return ['modelName', 'apiKey'];
        }
    };
    const [requiredFields, setRequiredFields] = React.useState(initRequiredFields());
    const childProps = {
        model,
        setHelpPanelContent,
        onChange,
        numFieldsInError,
        setNumFieldsInError,
        requiredFields,
        setRequiredFields
    };

    const updateRequiredFields = () => {
        if (model.modelProvider.label === MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX].label) {
            setRequiredFields(['apiKey', 'inferenceEndpoint']);
        } else if (model.modelProvider.label === MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX].label) {
            setRequiredFields(['modelName']);
        } else {
            setRequiredFields(['apiKey', 'modelName']);
        }
    };

    const isRequiredFieldsFilled = () => {
        for (const field of requiredFields) {
            if (!model[field] || model[field].length === 0) {
                return false;
            }
        }
        return true;
    };

    const isValidInteger = (parameter) => {
        const intValue = parseInt(parameter.value, 10);
        return !(isNaN(intValue) || !Number.isInteger(intValue));
    };

    const isValidFloat = (parameter) => {
        const floatValue = parseFloat(parameter.value);
        return !(isNaN(floatValue) || Number.isNaN(floatValue));
    };

    const isValidBoolean = (parameter) => {
        const lowerCaseValue = parameter.value.toLowerCase();
        return ['true', 'yes', 'false', 'no'].includes(lowerCaseValue);
    };

    const validateList = (parameter) => {
        try {
            let parameterValue = parameter.value;
            if (parameterValue[0] !== '[') {
                parameterValue = '[' + parameterValue;
            }
            if (parameterValue[parameterValue.length - 1] !== ']') {
                parameterValue = parameterValue + ']';
            }
            JSON.parse(parameterValue);
        } catch (error) {
            return false;
        }
        return true;
    };

    const isModelParametersValid = () => {
        for (const parameter of model.modelParameters) {
            let isValidType = false;
            const paramFields = Object.keys(parameter);
            if (paramFields.length < 3 || parameter.key.length < 1 || parameter.value.length < 1) {
                return false;
            }
            // eslint-disable-next-line default-case
            switch (parameter.type.value) {
                case 'string':
                    isValidType = true;
                    break;
                case 'integer':
                    isValidType = isValidInteger(parameter);
                    break;
                case 'float':
                    isValidType = isValidFloat(parameter);
                    break;
                case 'boolean':
                    isValidType = isValidBoolean(parameter);
                    break;
                case 'list':
                    isValidType = validateList(parameter);
                    break;
                case 'dictionary':
                    try {
                        JSON.parse(parameter.value);
                        isValidType = true;
                    } catch (e) {
                        isValidType = false;
                    }
                    break;
            }

            if (!isValidType) {
                return false;
            }
        }
        return true;
    };

    const updateError = () => {
        if (numFieldsInError > 0 || !isRequiredFieldsFilled() || !isModelParametersValid()) {
            onChange({ inError: true });
        } else if (numFieldsInError === 0 && isRequiredFieldsFilled()) {
            onChange({ inError: false });
        }
    };

    React.useEffect(() => {
        updateError();
    }, [requiredFields]);

    // prettier-ignore
    React.useEffect(() => { //NOSONAR - no need to refactor, it is already broken down into separate functions
        updateRequiredFields();
        updateError();
    }, [
        numFieldsInError,
        model.modelProvider,
        model.modelName,
        model.apiKey,
        model.temperature,
        model.promptTemplate,
        model.inferenceEndpoint,
        model.modelParameters,
    ]);

    return (
        <Box margin={{ bottom: 'l' }}>
            <SpaceBetween size="l">
                <ModelSelection {...childProps} />
                <AdvancedModelSettings {...childProps} />
            </SpaceBetween>
        </Box>
    );
};

export default Model;
