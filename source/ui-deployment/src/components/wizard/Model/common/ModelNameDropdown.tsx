// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Box, FormField, Link, Select, SelectProps, SpaceBetween } from '@cloudscape-design/components';
import { InfoLink } from '../../../commons/common-components';

import { ModelNameOption } from '../../interfaces';
import { formatModelNamesList } from '../helpers';
import { DropdownStatusProps } from '@cloudscape-design/components/internal/components/dropdown-status';
import { useModelNameQuery } from 'hooks/useQueries';
import { IG_DOCS } from '@/utils/constants';

export interface ModelNameDropdownProps {
    modelData: any;
    modelNameFormLabel?: string;
    modelNameFormDescription?: string;
    onChangeFn: (e: any) => void;
    setHelpPanelContent?: (e: any) => void;
    handleWizardNextStepLoading?: (isLoading: boolean) => void;
}

export const ModelNameDropdown = (props: ModelNameDropdownProps) => {
    const [options, setOptions] = React.useState<SelectProps.Option[]>([]);
    const [status, setStatus] = React.useState<DropdownStatusProps.StatusType>('pending');

    const providerName = props.modelData.modelProvider.value;

    const { isPending, isError, data, error } = useModelNameQuery(providerName);
    // Handle loading state in useEffect
    React.useEffect(() => {
        if (props.handleWizardNextStepLoading) {
            props.handleWizardNextStepLoading(isPending);
        }
    }, [isPending, props.handleWizardNextStepLoading]);

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
                const options = formatModelNamesList(data, providerName);
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
                    onFollow={() => props.setHelpPanelContent!(modelNameInfoPanel)}
                    ariaLabel={'Information about model name.'}
                />
            }
            description={
                props.modelNameFormDescription ??
                'Select the name of the model from the model provider to use for this deployment.'
            }
            data-testid="model-name-dropdown"
        >
            <SpaceBetween size="xs">
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
                {modelNameSelectedOption && (
                    <Alert type="warning" data-testid="inference-profile-alert">
                        <Box variant="p">
                            Please check if the selected model requires an inference profile. Not all models are
                            available in all AWS regions in direct on-demand mode and may require an inference profile.
                        </Box>
                        <Box variant="p">
                            For more information on which models require inference profiles, please refer to the{' '}
                            <Link
                                external={true}
                                href="https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html"
                                target="_blank"
                                data-testid="inference-profile-docs-link"
                            >
                                Amazon Bedrock Inference Profiles documentation
                            </Link>
                            .
                        </Box>
                    </Alert>
                )}
            </SpaceBetween>
        </FormField>
    );
};

//INFO PANELS CONTENT
const modelNameInfoPanel = {
    title: 'Model name',
    content: (
        <div>
            <Box variant="p">Select the name of the model from the model provider to use for this deployment.</Box>

            <Box variant="p">
                If using Amazon Bedrock, work with your DevOps administrator to ensure model access has been configured
                in the AWS account before attempting to deploy a model from this list.
            </Box>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.SUPPORTED_LLMS,
            text: 'Supported Models'
        },
        {
            href: IG_DOCS.CHOOSING_LLMS,
            text: 'Choosing the right LLM'
        },
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html',
            text: 'Amazon Bedrock - How to enable model access'
        },
        {
            href: IG_DOCS.CONCEPTS,
            text: 'Concepts and Definitions - DevOps user'
        }
    ]
};
