// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '../../commons/common-components';
import { Alert, Box, FormField, RadioGroup, RadioGroupProps, SpaceBetween } from '@cloudscape-design/components';
import { BaseToggleComponentProps } from '../interfaces/BaseFormComponent';
import { getBooleanString } from '../utils';

interface EnableTraceProps extends BaseToggleComponentProps {
    agent: any;
}

export const EnableTrace = (props: EnableTraceProps) => {
    const onEnableTraceChange = (detail: RadioGroupProps.ChangeDetail) => {
        const enableTrace = detail.value === 'Yes';
        props.onChangeFn({ 'enableTrace': enableTrace });
    };
    return (
        <SpaceBetween size="s">
            <FormField
                label="Enable trace"
                info={
                    <InfoLink
                        onFollow={() => props.setHelpPanelContent!(enableTraceInfoPanel)}
                        ariaLabel={'Information about enabling trace for agents'}
                    />
                }
                stretch={true}
                data-testid="enable-trace-source-field"
                description="Select whether the trace of the orchestration steps taken by the should be returned"
            >
                <RadioGroup
                    onChange={({ detail }) => onEnableTraceChange(detail)}
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
                    value={getBooleanString(props.agent.enableTrace)}
                    data-testid="enable-trace-radio-group"
                />
            </FormField>
            {props.agent.enableTrace && (
                <Alert statusIconAriaLabel="Info" header="Note: Logging Sensitive Data">
                    With trace enabled, sensitive information such as prompt template may be logged to CloudWatch Logs.
                </Alert>
            )}
        </SpaceBetween>
    );
};

export default EnableTrace;

const enableTraceInfoPanel = {
    title: 'Enable trace',
    content: (
        <Box variant="p">
            If enabled, the agent trace will be displayed with the response. It helps you follow helps you the agent's
            reasoning process that led it to the information it processed, the actions it took, and the final result it
            yielded.
        </Box>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/trace-events.html',
            text: 'Trace enablement'
        },
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html',
            text: 'Bedrock InvokeAgent API'
        }
    ]
};
