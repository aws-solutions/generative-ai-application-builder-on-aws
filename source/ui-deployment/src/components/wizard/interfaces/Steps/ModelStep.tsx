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

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { DEFAULT_STEP_INFO, MODEL_FAMILY_PROVIDER_OPTIONS } from '../../steps-config';
import { StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import Model from '../../Model';
import { mapModelStepInfoFromDeployment } from '../../utils';

export interface ModelSettings extends BaseWizardProps {
    modelProvider: { label: string; value: string };
    apiKey: string;
    modelName: string;
    provisionedModel: boolean;
    modelArn: string;
    enableGuardrails: boolean;
    guardrailIdentifier: string;
    guardrailVersion: string;
    modelParameters: any[];
    temperature: number;
    verbose: boolean;
    streaming: boolean;
    sagemakerInputSchema: any;
    sagemakerOutputSchema: string;
    sagemakerEndpointName: string;
    inferenceProfileId: string;
}
export class ModelStep extends BaseWizardStep {
    public id: string = 'model';
    public title: string = 'Select model';

    public props: ModelSettings = {
        modelProvider: DEFAULT_STEP_INFO.model.modelProvider,
        apiKey: DEFAULT_STEP_INFO.model.apiKey,
        modelName: DEFAULT_STEP_INFO.model.modelName,
        provisionedModel: DEFAULT_STEP_INFO.model.provisionedModel,
        modelArn: DEFAULT_STEP_INFO.model.modelArn,
        enableGuardrails: DEFAULT_STEP_INFO.model.enableGuardrails,
        guardrailIdentifier: DEFAULT_STEP_INFO.model.guardrailIdentifier,
        guardrailVersion: DEFAULT_STEP_INFO.model.guardrailVersion,
        modelParameters: DEFAULT_STEP_INFO.model.modelParameters,
        temperature: DEFAULT_STEP_INFO.model.temperature,
        verbose: DEFAULT_STEP_INFO.model.verbose,
        streaming: DEFAULT_STEP_INFO.model.streaming,
        sagemakerInputSchema: DEFAULT_STEP_INFO.model.sagemakerInputSchema,
        sagemakerOutputSchema: DEFAULT_STEP_INFO.model.sagemakerOutputSchema,
        sagemakerEndpointName: DEFAULT_STEP_INFO.model.sagemakerEndpointName,
        inferenceProfileId: DEFAULT_STEP_INFO.model.inferenceProfileId,
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Select model',
        content: <Box variant="p">Use this page to configure the LLM to be used by the deployment.</Box>,
        links: [
            {
                href: IG_DOCS.SUPPORTED_LLMS,
                text: 'Supported LLM Providers'
            },
            {
                href: IG_DOCS.COST,
                text: 'Cost'
            }
        ]
    };

    public contentGenerator: (props: StepContentProps) => JSX.Element = (props: StepContentProps) => {
        return <Model {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {
        const modelProvider = MODEL_FAMILY_PROVIDER_OPTIONS.find(
            (item) => item.value === selectedDeployment.LlmParams.ModelProvider
        );

        ({
            modelProvider: this.props.modelProvider,
            apiKey: this.props.apiKey,
            modelName: this.props.modelName,
            provisionedModel: this.props.provisionedModel,
            modelArn: this.props.modelArn,
            enableGuardrails: this.props.enableGuardrails,
            guardrailIdentifier: this.props.guardrailIdentifier,
            guardrailVersion: this.props.guardrailVersion,
            modelParameters: this.props.modelParameters,
            temperature: this.props.temperature,
            verbose: this.props.verbose,
            streaming: this.props.streaming,
            sagemakerInputSchema: this.props.sagemakerInputSchema,
            sagemakerOutputSchema: this.props.sagemakerOutputSchema,
            sagemakerEndpointName: this.props.sagemakerEndpointName,
            inferenceProfileId: this.props.inferenceProfileId,
            inError: this.props.inError
        } = mapModelStepInfoFromDeployment(selectedDeployment, modelProvider));
    };
}
