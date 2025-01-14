// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '../../commons/common-components';
import { Box, FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { BaseToggleComponentProps } from '../interfaces/BaseFormComponent';
import { IG_DOCS, USECASE_TYPES } from '@/utils/constants';
import { getBooleanString } from '../utils';

interface DeployUIProps extends BaseToggleComponentProps {
    deployUI: boolean;
    useCaseType: string;
}

export const DeployUI = (props: DeployUIProps) => {
    const onDeployUI = (detail: RadioGroupProps.ChangeDetail) => {
        const deployUI = detail.value === 'Yes';
        props.onChangeFn({ 'deployUI': deployUI });
    };

    //INFO PANEL CONTENT
    const deployUIInfoPanel = {
        title: 'Deploy UI',
        content: (
            <Box variant="p">
                If enabled, a UI served by CloudFront will be deployed to interact with the use case. If you wish to
                create your own UI to integrate directly with the use cases API, you can choose to not deploy the
                included UI.
            </Box>
        ),
        links: [
            {
                href: IG_DOCS.CLOUDFRONT,
                text: 'CloudFront UI'
            },
            {
                href: IG_DOCS.USING_UI,
                text: 'Using the UI'
            },
            {
                href:
                    props.useCaseType === USECASE_TYPES.AGENT
                        ? IG_DOCS.AGENT_USE_CASE_API_SPEC
                        : IG_DOCS.TEXT_USE_CASE_API_SPEC,
                text: 'Using the API'
            }
        ]
    };

    return (
        <FormField
            label="Deploy a UI for the use case?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(deployUIInfoPanel)}
                    ariaLabel={'Information about deploying UIs for use cases'}
                />
            }
            stretch={true}
            data-testid="deploy-ui-source-field"
            description="Deploy a UI served by CloudFront for interacting with the use case"
        >
            <RadioGroup
                onChange={({ detail }) => onDeployUI(detail)}
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
                value={getBooleanString(props.deployUI)}
                data-testid="deploy-ui-radio-group"
            />
        </FormField>
    );
};

export default DeployUI;
