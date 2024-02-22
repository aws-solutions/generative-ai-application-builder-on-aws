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

export interface WizardStep {
    title: string;
    stateKey: string;
    content: any;
}

export type WizardSteps = WizardStep[];

export interface ToolHelpPanelContent {
    title: string;
    links: {
        href: string;
        text: string;
    }[];
    content: React.JSX.Element;
}

export interface StepContentProps {
    info: any;
    onChange: (e: any) => void;
    setHelpPanelContent: (e: any) => void;
}

/**
 * Interface to be implemented by the any provider specific AdvancedRagConfig
 * component
 */
export interface AdvancedKnowledgeBaseConfigProps {
    knowledgeBaseData: any;
    onChangeFn: (e: any) => void;
    setHelpPanelContent: (e: any) => void;
    setNumFieldsInError: React.Dispatch<any>;
}

/**
 * Interface to be implemented by the any provider specific AdvancedRagConfig
 * component
 */
export interface KnowledgeBaseConfigProps {
    knowledgeBaseData: any;
    onChangeFn: (e: any) => void;
    setHelpPanelContent: (e: any) => void;
    setNumFieldsInError: React.Dispatch<any>;
    setRequiredFields?: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface ReviewProps {
    info: {
        useCase: any;
        knowledgeBase: any;
        model: any;
        vpc: any;
    };
    setActiveStepIndex: (e: number) => void;
}

export interface ReviewSectionProps {
    header: string;
    setActiveStepIndex: (e: number) => void;
}
