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

import { SelectProps } from '@cloudscape-design/components';
import React from 'react';

/**
 * Base interface that specifies the props for all form components for the pages of the wizard
 */
export interface BaseFormComponentProps {
    onChangeFn: (detail: any) => void;
    setNumFieldsInError: React.Dispatch<any>;
    setHelpPanelContent?: (content: any) => void;
}

export interface BaseToggleComponentProps {
    setHelpPanelContent?: (content: any) => void;
    onChangeFn: (detail: any) => void;
    disabled?: boolean;
}

export type ModelProviderOption = SelectProps.Option;
export type ModelNameOption = SelectProps.Option;
