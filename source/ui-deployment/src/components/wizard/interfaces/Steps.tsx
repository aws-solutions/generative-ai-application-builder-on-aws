// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

export interface ComponentVisibility {
    showUseCaseOptions: boolean;
    showDeployUI: boolean;
    showManageUserAccess: boolean;
    showCollectUserFeedback: boolean;
    showPerformanceOptimization: boolean;
}

export interface ModelComponentVisibility {
    showMultimodalInputSupport: boolean;
}

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
    handleWizardNextStepLoading?: (e: boolean) => void;
    visibility?: ComponentVisibility | null;
    modelVisibility?: ModelComponentVisibility | null;
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

export interface ReviewProps extends StepContentProps {
    setActiveStepIndex: (e: number) => void;
}

export interface ReviewSectionProps {
    header: string;
    setActiveStepIndex: (e: number) => void;
    stepIndex?: number; // Optional step index to override the default
}
