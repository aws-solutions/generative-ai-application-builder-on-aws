// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SelectProps } from '@cloudscape-design/components';
import React from 'react';

/**
 * Base interface that specifies the props for all form components for the pages of the wizard
 */
export interface BaseFormComponentProps {
    onChangeFn: (detail: any) => void;
    setNumFieldsInError: React.Dispatch<any>;
    setHelpPanelContent?: (content: any) => void;
    handleWizardNextStepLoading?: (isLoading: boolean) => void;
}

export interface BaseToggleComponentProps {
    setHelpPanelContent?: (content: any) => void;
    onChangeFn: (detail: any) => void;
    disabled?: boolean;
    handleWizardNextStepLoading?: (isLoading: boolean) => void;
}

export type ModelProviderOption = SelectProps.Option;
export type ModelNameOption = SelectProps.Option;
