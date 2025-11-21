// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, FormField, Input, RadioGroup, RadioGroupProps, Alert, SpaceBetween } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '@/components/wizard/interfaces/';
import { InfoLink, ExternalLink } from '@/components/commons';
import { updateNumFieldsInError } from '../utils';
import React from 'react';

const MIN_PROVISIONED_CONCURRENCY = 1;
const MAX_PROVISIONED_CONCURRENCY = 5;

interface EnableProvisionedConcurrencyRadioProps extends BaseFormComponentProps {
    provisionedConcurrencyValue: number;
}

export const EnableProvisionedConcurrencyRadio = (props: EnableProvisionedConcurrencyRadioProps) => {
    const [isEnabled, setIsEnabled] = React.useState((props.provisionedConcurrencyValue || 0) > 0);
    const [concurrencyError, setConcurrencyError] = React.useState('');
    const [concurrencyValue, setConcurrencyValue] = React.useState(props.provisionedConcurrencyValue || 0);

    React.useEffect(() => {
        const shouldBeEnabled = (props.provisionedConcurrencyValue || 0) > 0;
        setIsEnabled(shouldBeEnabled);
        if (shouldBeEnabled && concurrencyValue === 0) {
            setConcurrencyValue(props.provisionedConcurrencyValue);
        } else if (!shouldBeEnabled) {
            setConcurrencyValue(0);
        }
    }, [props.provisionedConcurrencyValue]);

    const onEnableProvisionedConcurrencyChange = (detail: RadioGroupProps.ChangeDetail) => {
        const enableValue = detail.value === 'Yes';
        setIsEnabled(enableValue);
        
        if (enableValue) {
            setConcurrencyValue(MIN_PROVISIONED_CONCURRENCY);
            props.onChangeFn({
                'provisionedConcurrencyValue': MIN_PROVISIONED_CONCURRENCY
            });
        } else {
            setConcurrencyValue(0);
            props.onChangeFn({
                'provisionedConcurrencyValue': 0
            });
            updateNumFieldsInError('', concurrencyError, props.setNumFieldsInError);
            setConcurrencyError('');
        }
    };

    const onConcurrencyValueChange = (detail: any) => {
        const numValue = parseFloat(detail.value);
        setConcurrencyValue(numValue);
        
        let errors = '';
        if (detail.value.length > 0 && (isNaN(numValue) || detail.value.includes('.') || parseFloat(detail.value) !== parseInt(detail.value))) {
            errors += 'Must be a whole number. ';
        } else if (numValue < MIN_PROVISIONED_CONCURRENCY || numValue > MAX_PROVISIONED_CONCURRENCY) {
            errors += `Must be between ${MIN_PROVISIONED_CONCURRENCY} and ${MAX_PROVISIONED_CONCURRENCY}.`;
        }
        
        props.onChangeFn({
            'provisionedConcurrencyValue': numValue
        });
        
        updateNumFieldsInError(errors, concurrencyError, props.setNumFieldsInError);
        setConcurrencyError(errors);
    };

    return (
        <SpaceBetween size="s">
            <FormField
                label="Do you want to enable provisioned concurrency?"
                description="Keep Lambda functions warm to reduce cold start latency."
                info={
                    <InfoLink
                        onFollow={() => props.setHelpPanelContent!(enableProvisionedConcurrencyRadioInfoPanel)}
                        ariaLabel={'Information about enabling provisioned concurrency.'}
                    />
                }
            >
                <RadioGroup
                    onChange={({ detail }) => onEnableProvisionedConcurrencyChange(detail)}
                    items={[
                        {
                            value: 'Yes',
                            label: 'Yes'
                        },
                        {
                            value: 'No',
                            label: 'No'
                        }
                    ]}
                    value={isEnabled ? 'Yes' : 'No'}
                    data-testid="enable-provisioned-concurrency-radio-group"
                />
            </FormField>

            {isEnabled && (
                <SpaceBetween size="s">
                    <FormField
                        label="Concurrency Value"
                        description="Number of execution environments to keep warm."
                        constraintText={`Min: ${MIN_PROVISIONED_CONCURRENCY}, Max: ${MAX_PROVISIONED_CONCURRENCY}.`}
                        errorText={concurrencyError}
                        data-testid="provisioned-concurrency-field"
                    >
                        <Input
                            type="number"
                            value={concurrencyValue.toString()}
                            onChange={({ detail }) => onConcurrencyValueChange(detail)}
                            placeholder={`Enter concurrency value (${MIN_PROVISIONED_CONCURRENCY}-${MAX_PROVISIONED_CONCURRENCY})`}
                            data-testid="provisioned-concurrency-value-input"
                        />
                    </FormField>
                    <Alert type="warning" statusIconAriaLabel="Warning">
                        Enabling provisioned concurrency will incur additional Lambda costs. See{' '}
                        <ExternalLink href="https://aws.amazon.com/lambda/pricing/">
                            Lambda pricing
                        </ExternalLink>{' '}
                        for details.
                    </Alert>
                </SpaceBetween>
            )}
        </SpaceBetween>
    );
};

const enableProvisionedConcurrencyRadioInfoPanel = {
    title: 'Provisioned Concurrency',
    content: (
            <Box variant="p">
                Provisioned concurrency keeps Lambda functions warm to reduce cold start latency.
                This ensures consistent response times by maintaining a specified number of execution
                environments ready to respond immediately to invocations.
            </Box>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html',
            text: 'Provisioned concurrency'
        }
    ]
};

export default EnableProvisionedConcurrencyRadio;