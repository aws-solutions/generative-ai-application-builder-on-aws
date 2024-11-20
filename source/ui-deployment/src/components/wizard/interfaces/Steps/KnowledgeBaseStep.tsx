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
import { DEFAULT_STEP_INFO } from '../../steps-config';
import { StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import KnowledgeBase from '../../KnowledgeBase';
import { generateKnowledgeBaseStepInfoFromDeployment } from '../../utils';

export interface KnowledgeBaseSettings extends BaseWizardProps {
    isRagRequired: boolean;
    knowledgeBaseType: { value: string; label: string };
    existingKendraIndex: string;
    kendraIndexId: string;
    kendraAdditionalQueryCapacity: number;
    kendraAdditionalStorageCapacity: number;
    kendraEdition: { value: string; label: string };
    maxNumDocs: number;
    scoreThreshold: number;
    noDocsFoundResponse: string | undefined;
    kendraIndexName: string;
    returnDocumentSource: boolean;
    bedrockKnowledgeBaseId: string;
    enableRoleBasedAccessControl: boolean;
    queryFilter: any;
}
export class KnowledgeBaseStep extends BaseWizardStep {
    public id: string = 'knowledgeBase';
    public title: string = 'Select knowledge base';
    public isOptional: boolean = true;

    public props: KnowledgeBaseSettings = {
        isRagRequired: DEFAULT_STEP_INFO.knowledgeBase.isRagRequired,
        knowledgeBaseType: DEFAULT_STEP_INFO.knowledgeBase.knowledgeBaseType,
        existingKendraIndex: DEFAULT_STEP_INFO.knowledgeBase.existingKendraIndex,
        kendraIndexId: DEFAULT_STEP_INFO.knowledgeBase.kendraIndexId,
        kendraAdditionalQueryCapacity: DEFAULT_STEP_INFO.knowledgeBase.kendraAdditionalQueryCapacity,
        kendraAdditionalStorageCapacity: DEFAULT_STEP_INFO.knowledgeBase.kendraAdditionalStorageCapacity,
        kendraEdition: DEFAULT_STEP_INFO.knowledgeBase.kendraEdition,
        maxNumDocs: DEFAULT_STEP_INFO.knowledgeBase.maxNumDocs,
        scoreThreshold: DEFAULT_STEP_INFO.knowledgeBase.scoreThreshold,
        noDocsFoundResponse: DEFAULT_STEP_INFO.knowledgeBase.noDocsFoundResponse,
        kendraIndexName: DEFAULT_STEP_INFO.knowledgeBase.kendraIndexName,
        returnDocumentSource: DEFAULT_STEP_INFO.knowledgeBase.returnDocumentSource,
        bedrockKnowledgeBaseId: DEFAULT_STEP_INFO.knowledgeBase.bedrockKnowledgeBaseId,
        enableRoleBasedAccessControl: DEFAULT_STEP_INFO.knowledgeBase.enableRoleBasedAccessControl,
        queryFilter: DEFAULT_STEP_INFO.knowledgeBase.queryFilter,
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Knowledge base selection',
        content: (
            <div>
                <Box variant="p">
                    Use this page to configure a knowledge base to enable <b>Retrieval Augmented Generation (RAG)</b>.
                    Connecting a knowledge base to the deployment enables it to source additional information to pass
                    onto the LLM. Disabling RAG uses the LLM as is.
                </Box>

                <Box variant="p">
                    RAG is a technique that leverages prompt-based learning to “train” a LLM on new information it
                    wasn’t originally trained on. Instead of using the traditional method of fine-tuning a model on
                    custom data, prompt-based learning and RAG rely on a concept called{' '}
                    <b>
                        <i>context stuffing</i>
                    </b>
                    . By “stuffing” additional “context” into your prompt, you can show the LLM new information it
                    hasn’t yet seen such as private documents, technical jargon, the latest news articles, etc.
                </Box>
            </div>
        ),
        links: [
            {
                href: IG_DOCS.INGESTING_DATA,
                text: 'Ingesting data into your Knowledge base'
            }
        ]
    };

    public contentGenerator: (props: StepContentProps) => JSX.Element = (props: StepContentProps) => {
        return <KnowledgeBase {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {
        ({
            isRagRequired: this.props.isRagRequired,
            knowledgeBaseType: this.props.knowledgeBaseType,
            existingKendraIndex: this.props.existingKendraIndex,
            kendraIndexId: this.props.kendraIndexId,
            kendraAdditionalQueryCapacity: this.props.kendraAdditionalQueryCapacity,
            kendraAdditionalStorageCapacity: this.props.kendraAdditionalStorageCapacity,
            kendraEdition: this.props.kendraEdition,
            maxNumDocs: this.props.maxNumDocs,
            scoreThreshold: this.props.scoreThreshold,
            noDocsFoundResponse: this.props.noDocsFoundResponse,
            kendraIndexName: this.props.kendraIndexName,
            returnDocumentSource: this.props.returnDocumentSource,
            bedrockKnowledgeBaseId: this.props.bedrockKnowledgeBaseId,
            enableRoleBasedAccessControl: this.props.enableRoleBasedAccessControl,
            queryFilter: this.props.queryFilter,
            inError: this.props.inError
        } = generateKnowledgeBaseStepInfoFromDeployment(selectedDeployment));
    };
}
