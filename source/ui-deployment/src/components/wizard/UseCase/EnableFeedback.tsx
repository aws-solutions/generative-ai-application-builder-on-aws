// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '../../commons/common-components';
import { Box, FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { BaseToggleComponentProps } from '../interfaces/BaseFormComponent';
import { getBooleanString } from '../utils';

interface EnableFeedbackProps extends BaseToggleComponentProps {
    feedbackEnabled: boolean;
}

export const EnableFeedback = (props: EnableFeedbackProps) => {
    const onEnableFeedbackChange = (detail: RadioGroupProps.ChangeDetail) => {
        const feedbackEnabled = detail.value === 'Yes';
        props.onChangeFn({ 'feedbackEnabled': feedbackEnabled });
    };

    //INFO PANEL CONTENT
    const enableFeedbackInfoPanel = {
        title: 'Enable User Feedback',
        content: (
            <Box variant="p">
                If enabled, the chat UI will include thumbs up and thumbs down buttons to 
                allow users to provide feedback on the use case.
                When users provide feedback, their input (type of feedback and any comments) 
                will be recorded in a JSON file and stored in an S3 bucket. Customers can then export
                 or access this feedback data as needed for further analysis or reporting.
            </Box>
        )
    };

    return (
        <FormField
            label="Do you want to enable user feedback for this use case?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(enableFeedbackInfoPanel)}
                    ariaLabel={'Information about enabling feedback for use cases'}
                />
            }
            stretch={true}
            data-testid="enable-feedback-source-field"
            description="Allow users to provide feedback through thumbs up and thumbs down buttons."
        >
            <RadioGroup
                onChange={({ detail }) => onEnableFeedbackChange(detail)}
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
                value={getBooleanString(props.feedbackEnabled)}
                data-testid="enable-feedback-radio-group"
            />
        </FormField>
    );
};

export default EnableFeedback;
