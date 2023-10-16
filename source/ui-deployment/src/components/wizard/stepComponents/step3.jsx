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

import React, { useContext } from 'react';
import {
    Box,
    Container,
    Header,
    ExpandableSection,
    FormField,
    Input,
    RadioGroup,
    SpaceBetween,
    Select,
    Alert
} from '@cloudscape-design/components';
import { InfoLink } from '../../commons/common-components';
import { KENDRA_EDITIONS, KNOWLEDGE_BASE_TYPES } from '../steps-config';
import { TOOLS_CONTENT } from '../tools-content.jsx';
import { getFieldOnChange, updateNumFieldsInError } from '../utils';
import {
    MIN_KENDRA_INDEX_ID_LENGTH,
    MAX_KENDRA_INDEX_ID_LENGTH,
    MIN_KENDRA_IDX_NAME_LENGTH,
    MAX_KENDRA_IDX_NAME_LENGTH,
    MIN_ADDITIONAL_KENDRA_QUERY_CAPACITY,
    MAX_ADDITIONAL_KENDRA_QUERY_CAPACITY,
    MIN_ADDITIONAL_KENDRA_STORAGE_CAPACITY,
    MAX_ADDITIONAL_KENDRA_STORAGE_CAPACITY,
    MIN_KNOWLEDGE_BASE_NUM_DOCS,
    MAX_KNOWLEDGE_BASE_NUM_DOCS,
    DEPLOYMENT_ACTIONS,
    KENDRA_WARNING
} from '../../../utils/constants';
import HomeContext from '../../../home/home.context';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

const KendraOptions = ({
    knowledgeBase,
    onChange,
    setHelpPanelContent,
    numFieldsInError,
    setNumFieldsInError,
    requiredFields,
    setRequiredFields,
    updateError
}) => {
    const [kendraIndexIdError, setKendraIndexIdError] = React.useState('');
    const [kendraIndexNameError, setKendraIndexNameError] = React.useState('');
    const [kendraAdditionalQueryCapacityError, setKendraAdditionalQueryCapacityError] = React.useState('');
    const [kendraAdditionalStorageCapacityError, setKendraAdditionalStorageCapacityError] = React.useState('');

    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    React.useEffect(() => {
        if (knowledgeBase.existingKendraIndex === 'yes') {
            const list = requiredFields.filter((i) => i !== 'kendraIndexName').filter((i) => i !== 'kendraIndexId');
            setRequiredFields([...list, 'kendraIndexId']);

            if (kendraIndexIdError.length > 0) {
                setNumFieldsInError((numFieldsInError) => numFieldsInError + 1);
            }

            if (kendraIndexNameError.length > 0) {
                setNumFieldsInError((numFieldsInError) => numFieldsInError - 1);
            }
        } else if (knowledgeBase.existingKendraIndex === 'no') {
            const list = requiredFields.filter((i) => i !== 'kendraIndexName').filter((i) => i !== 'kendraIndexId');
            setRequiredFields([...list, 'kendraIndexName']);

            if (kendraIndexIdError.length > 0) {
                setNumFieldsInError((numFieldsInError) => numFieldsInError - 1);
            }

            if (kendraIndexNameError.length > 0) {
                setNumFieldsInError((numFieldsInError) => numFieldsInError + 1);
            }
        }
        updateError();
    }, [knowledgeBase.existingKendraIndex]);

    const onExistingKendraIndexChange = getFieldOnChange('radio', 'existingKendraIndex', onChange);
    const onKendraEditionChange = getFieldOnChange('select', 'kendraEdition', onChange);
    const onKnowledgeBaseTypeChange = getFieldOnChange('select', 'knowledgeBaseType', onChange);

    const onKendraIndexIdChange = ({ detail }) => {
        onChange({ kendraIndexId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^[a-zA-Z0-9_+:-]{${MIN_KENDRA_INDEX_ID_LENGTH},${MAX_KENDRA_INDEX_ID_LENGTH}}$`)) {
            errors +=
                'Can only include alphanumeric characters, -, _, +, and : must be between ' +
                MIN_KENDRA_INDEX_ID_LENGTH +
                ' and ' +
                MAX_KENDRA_INDEX_ID_LENGTH +
                ' characters. ';
        }

        updateNumFieldsInError(errors, kendraIndexIdError, setNumFieldsInError);
        setKendraIndexIdError(errors);
    };

    const onKendraIndexNameChange = ({ detail }) => {
        onChange({ kendraIndexName: detail.value });
        let errors = '';

        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }

        if (!detail.value.match(`^[0-9a-zA-Z-]{${MIN_KENDRA_IDX_NAME_LENGTH},${MAX_KENDRA_IDX_NAME_LENGTH}}$`)) {
            errors +=
                'Can only include alphanumeric characters and hyphens and must be between ' +
                MIN_KENDRA_IDX_NAME_LENGTH +
                ' and ' +
                MAX_KENDRA_IDX_NAME_LENGTH +
                ' characters. ';
        }

        updateNumFieldsInError(errors, kendraIndexNameError, setNumFieldsInError);
        setKendraIndexNameError(errors);
    };

    const onKendraAdditionalQueryCapacityChange = ({ detail }) => {
        onChange({ kendraAdditionalQueryCapacity: detail.value });
        let errors = '';
        if (!Number.isInteger(parseFloat(detail.value))) {
            errors += 'Must be a whole number. Can only include characters 0-9. ';
        } else if (
            parseFloat(detail.value) < MIN_ADDITIONAL_KENDRA_QUERY_CAPACITY ||
            parseFloat(detail.value) > MAX_ADDITIONAL_KENDRA_QUERY_CAPACITY
        ) {
            errors +=
                'Number must be between ' +
                MIN_ADDITIONAL_KENDRA_QUERY_CAPACITY +
                ' and ' +
                MAX_ADDITIONAL_KENDRA_QUERY_CAPACITY +
                '. ';
        }

        updateNumFieldsInError(errors, kendraAdditionalQueryCapacityError, setNumFieldsInError);
        setKendraAdditionalQueryCapacityError(errors);
    };

    const onKendraAdditionalStorageCapacityChange = ({ detail }) => {
        onChange({ kendraAdditionalStorageCapacity: detail.value });
        let errors = '';
        if (!Number.isInteger(parseFloat(detail.value))) {
            errors += 'Must be a whole number. Can only include characters 0-9. ';
        } else if (
            parseFloat(detail.value) < MIN_ADDITIONAL_KENDRA_STORAGE_CAPACITY ||
            parseFloat(detail.value) > MAX_ADDITIONAL_KENDRA_STORAGE_CAPACITY
        ) {
            errors +=
                'Number must be between ' +
                MIN_ADDITIONAL_KENDRA_STORAGE_CAPACITY +
                ' and ' +
                MAX_ADDITIONAL_KENDRA_STORAGE_CAPACITY +
                '. ';
        }

        updateNumFieldsInError(errors, kendraAdditionalStorageCapacityError, setNumFieldsInError);
        setKendraAdditionalStorageCapacityError(errors);
    };

    return (
        <Container
            header={<Header variant="h2">Knowledge base options</Header>}
            footer={
                <Box data-testid="additional-kendra-options">
                    {knowledgeBase.existingKendraIndex === 'no' && (
                        <ExpandableSection headerText="Additional kendra options" variant="footer">
                            <SpaceBetween size="l">
                                <FormField
                                    label={<>Kendra additional query capacity</>}
                                    info={
                                        <InfoLink
                                            onFollow={() =>
                                                setHelpPanelContent(
                                                    knowledgeBaseToolsContent.kendraAdditionalQueryCapacity
                                                )
                                            }
                                            ariaLabel={'Information about query capacity.'}
                                        />
                                    }
                                    errorText={kendraAdditionalQueryCapacityError}
                                    data-testid="kendra-add-query-capacity"
                                >
                                    <Input
                                        onChange={onKendraAdditionalQueryCapacityChange}
                                        placeholder="Additional query capacity"
                                        value={knowledgeBase.kendraAdditionalQueryCapacity}
                                        type="number"
                                        autoComplete={false}
                                    />
                                </FormField>
                                <FormField
                                    label="Kendra additional storage capacity"
                                    info={
                                        <InfoLink
                                            onFollow={() =>
                                                setHelpPanelContent(
                                                    knowledgeBaseToolsContent.kendraAdditionalQueryCapacity
                                                )
                                            }
                                            ariaLabel={'Information about storage capacity.'}
                                        />
                                    }
                                    errorText={kendraAdditionalStorageCapacityError}
                                    data-testid="kendra-add-storage-capacity"
                                >
                                    <Input
                                        onChange={onKendraAdditionalStorageCapacityChange}
                                        placeholder="Additional storage capacity"
                                        value={knowledgeBase.kendraAdditionalStorageCapacity}
                                        type="number"
                                        autoComplete={false}
                                    />
                                </FormField>
                                <FormField
                                    label="Kendra edition"
                                    info={
                                        <InfoLink
                                            onFollow={() =>
                                                setHelpPanelContent(
                                                    knowledgeBaseToolsContent.kendraAdditionalQueryCapacity
                                                )
                                            }
                                            ariaLabel={'Information about Kendra editions.'}
                                        />
                                    }
                                    data-testid="kendra-edition"
                                >
                                    <Select
                                        options={KENDRA_EDITIONS}
                                        onChange={onKendraEditionChange}
                                        selectedAriaLabel="Selected"
                                        selectedOption={knowledgeBase.kendraEdition}
                                    />
                                </FormField>
                            </SpaceBetween>
                        </ExpandableSection>
                    )}
                </Box>
            }
            data-testid="knowledge-base-options-container"
        >
            <SpaceBetween size="l">
                <FormField
                    label="Knowledge base type"
                    info={
                        <InfoLink
                            onFollow={() => setHelpPanelContent(knowledgeBaseToolsContent.default)}
                            ariaLabel={'Information about different knowledge bases.'}
                        />
                    }
                    description="Select a supported knowledge base to attach to the deployment."
                >
                    <Select
                        options={KNOWLEDGE_BASE_TYPES}
                        onChange={onKnowledgeBaseTypeChange}
                        selectedAriaLabel="Selected"
                        selectedOption={knowledgeBase.knowledgeBaseType}
                    />

                    <br />

                    <Alert statusIconAriaLabel="warning" type="warning">
                        <Box variant="p">{KENDRA_WARNING}</Box>
                    </Alert>
                </FormField>
                {deploymentAction !== DEPLOYMENT_ACTIONS.EDIT && (
                    <FormField
                        label="Do you have an existing Kendra index?*"
                        info={
                            <InfoLink
                                onFollow={() => setHelpPanelContent(knowledgeBaseToolsContent.kendraIndex)}
                                ariaLabel={'Information about having a Kendra Index.'}
                            />
                        }
                        stretch={true}
                        data-testid="existing-kendra-index-radio-group"
                    >
                        <RadioGroup
                            onChange={onExistingKendraIndexChange}
                            items={[
                                {
                                    value: 'yes',
                                    label: 'Yes'
                                },
                                {
                                    value: 'no',
                                    label: 'No',
                                    description: 'It will be created for you.'
                                }
                            ]}
                            value={knowledgeBase.existingKendraIndex}
                        />
                    </FormField>
                )}

                {knowledgeBase.existingKendraIndex === 'yes' && (
                    <FormField
                        label="Kendra index ID*"
                        info={
                            <InfoLink
                                onFollow={() => setHelpPanelContent(knowledgeBaseToolsContent.kendraIndex)}
                                ariaLabel={'Information about the Kendra Index.'}
                            />
                        }
                        description="Kendra index ID of an existing index in the AWS account."
                        constraintText="A valid Kendra index ID must be provided. The index ID can be found in the Kendra console."
                        errorText={kendraIndexIdError}
                        data-testid="input-kendra-index-id"
                    >
                        <Input
                            placeholder="Kendra index ID..."
                            value={knowledgeBase.kendraIndexId}
                            onChange={onKendraIndexIdChange}
                            autoComplete={false}
                        />
                    </FormField>
                )}

                {knowledgeBase.existingKendraIndex === 'no' && (
                    <FormField
                        label="Kendra index name*"
                        info={
                            <InfoLink
                                onFollow={() => setHelpPanelContent(knowledgeBaseToolsContent.kendraIndex)}
                                ariaLabel={'Information about the Kendra Index.'}
                            />
                        }
                        description="Name of the Kendra index to be created."
                        constraintText="Index name must be unique within the account."
                        errorText={kendraIndexNameError}
                        data-testid="input-kendra-index-name"
                    >
                        <Input
                            placeholder="Kendra index name..."
                            value={knowledgeBase.kendraIndexName}
                            onChange={onKendraIndexNameChange}
                            autoComplete={false}
                        />
                    </FormField>
                )}
            </SpaceBetween>
        </Container>
    );
};

const AdvancedKnowledgeBaseConfigs = ({
    knowledgeBase,
    onChange,
    setHelpPanelContent,
    numFieldsInError,
    setNumFieldsInError
}) => {
    const [maxNumDocsError, setMaxNumDocsError] = React.useState('');

    const onMaxNumDocsChange = ({ detail }) => {
        onChange({ maxNumDocs: detail.value });
        let errors = '';
        if (!Number.isInteger(parseFloat(detail.value))) {
            errors += 'Must be a whole number. Can only include characters 0-9. ';
        } else if (
            parseFloat(detail.value) < MIN_KNOWLEDGE_BASE_NUM_DOCS ||
            parseFloat(detail.value) > MAX_KNOWLEDGE_BASE_NUM_DOCS
        ) {
            errors +=
                'Number must be between ' + MIN_KNOWLEDGE_BASE_NUM_DOCS + ' and ' + MAX_KNOWLEDGE_BASE_NUM_DOCS + '. ';
        }

        updateNumFieldsInError(errors, maxNumDocsError, setMaxNumDocsError);
        setMaxNumDocsError(errors);
    };

    return (
        <Container header={<Header variant="h2">Advanced RAG configurations</Header>}>
            <SpaceBetween size="l">
                <FormField
                    label="Maximum number of documents to retrieve"
                    description="Optional: the max number of documents to use from the knowledge base."
                    constraintText={'Min: ' + MIN_KNOWLEDGE_BASE_NUM_DOCS + ', Max: ' + MAX_KNOWLEDGE_BASE_NUM_DOCS}
                    info={
                        <InfoLink
                            onFollow={() => setHelpPanelContent(knowledgeBaseToolsContent.maxNumDocs)}
                            ariaLabel={'Information about max documents to retrieve.'}
                        />
                    }
                    errorText={maxNumDocsError}
                    data-testid="input-max-num-docs"
                >
                    <Input
                        type="number"
                        onChange={onMaxNumDocsChange}
                        value={knowledgeBase.maxNumDocs}
                        autoComplete={false}
                    />
                </FormField>
            </SpaceBetween>
        </Container>
    );
};

const KnowledgeBase = ({ info: { knowledgeBase }, setHelpPanelContent, onChange }) => {
    const [numFieldsInError, setNumFieldsInError] = React.useState(0);

    const initRagSelectedOption = () => {
        if (knowledgeBase.isRagRequired) {
            return { label: 'yes', value: true };
        }
        return { label: 'no', value: false };
    };

    const initRequiredFieldsValue = () => {
        try {
            if (knowledgeBase.isRagRequired) {
                return ['existingKendraIndex'];
            }
            return [];
        } catch (error) {
            return [];
        }
    };
    const [ragSelectedOption, setRagSelectedOption] = React.useState(initRagSelectedOption);
    const [requiredFields, setRequiredFields] = React.useState(initRequiredFieldsValue);

    const isRequiredFieldsFilled = () => {
        for (const field of requiredFields) {
            if (knowledgeBase[field].length === 0) {
                return false;
            }
        }
        return true;
    };

    const updateError = () => {
        if (numFieldsInError > 0 || !isRequiredFieldsFilled()) {
            onChange({ inError: true });
        } else if (numFieldsInError === 0 && isRequiredFieldsFilled()) {
            onChange({ inError: false });
        }
    };

    // initial error state
    React.useEffect(() => {
        updateError();
    }, []);

    React.useEffect(() => {
        updateError();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        numFieldsInError,
        requiredFields,
        knowledgeBase.kendraIndexName,
        knowledgeBase.existingKendraIndex,
        knowledgeBase.kendraIndexId,
        knowledgeBase.kendraAdditionalQueryCapacity,
        knowledgeBase.kendraAdditionalStorageCapacity,
        knowledgeBase.maxNumDocs
    ]);

    const childProps = {
        knowledgeBase,
        setHelpPanelContent,
        onChange,
        numFieldsInError,
        setNumFieldsInError,
        requiredFields,
        setRequiredFields,
        updateError
    };

    const handleRagSelection = (event) => {
        setRagSelectedOption(event.detail.selectedOption);
        setRequiredFields([]);
        knowledgeBase.isRagRequired = event.detail.selectedOption.value;
    };

    return (
        <Box margin={{ bottom: 'l' }} data-testid="rag-required-dropdown">
            <SpaceBetween size="l">
                <Container
                    header={<Header variant="h2">Retrieval Augmented Generation (RAG)</Header>}
                    data-testid="rag-required-container"
                >
                    <SpaceBetween size="l">
                        <FormField
                            label="Do you want to enable Retrieval Augmented Generation (RAG) for this use case?"
                            description="If RAG is enabled, a Knowledge Base (such as one powered by Amazon Kendra) is required to be configured."
                            info={
                                <InfoLink
                                    onFollow={() => setHelpPanelContent(knowledgeBaseToolsContent.default)}
                                    ariaLabel={'Information about enabling RAG.'}
                                />
                            }
                        >
                            <Select
                                selectedOption={ragSelectedOption}
                                onChange={handleRagSelection}
                                options={[
                                    { label: 'yes', value: true },
                                    { label: 'no', value: false }
                                ]}
                            />
                        </FormField>
                    </SpaceBetween>
                </Container>
                {ragSelectedOption.value && <KendraOptions {...childProps} />}
                {ragSelectedOption.value && <AdvancedKnowledgeBaseConfigs {...childProps} />}
            </SpaceBetween>
        </Box>
    );
};
export default KnowledgeBase;
