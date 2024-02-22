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

import { BaseFormComponentProps } from '../interfaces';
import { TOOLS_CONTENT } from '../tools-content';

export interface VpcFormFieldProps extends BaseFormComponentProps {
    vpcData: any;
    disabled?: boolean;
}

/**
 * Validate subnet id based on:
 * https://docs.aws.amazon.com/codestar-connections/latest/APIReference/API_VpcConfiguration.htmls
 * @param subnetId subnet id
 * @returns
 */
export const isSubnetIdValid = (subnetId: string) => {
    if (!subnetId || subnetId === '') {
        return false;
    }
    return subnetId.match('^subnet-\\w{8}(\\w{9})?$') !== null && subnetId.length >= 15 && subnetId.length <= 24;
};

/**
 * Validate vpd id based on:
 * https://docs.aws.amazon.com/codestar-connections/latest/APIReference/API_VpcConfiguration.html
 * @param vpcId vpd id string
 * @returns
 */
export const isVpcIdValid = (vpcId: string) => {
    if (vpcId === '') {
        return false;
    }
    return vpcId.match('^vpc-\\w{8}(\\w{9})?$') !== null && vpcId.length >= 12 && vpcId.length <= 21;
};

/**
 * Validate security group id based on:
 * https://docs.aws.amazon.com/codestar-connections/latest/APIReference/API_VpcConfiguration.html
 * @param securityGroupId security group id string
 * @returns
 */
export const isSecurityGroupValid = (securityGroupId: string) => {
    if (!securityGroupId || securityGroupId === '') {
        return false;
    }
    return (
        securityGroupId.match('^sg-\\w{8}(\\w{9})?$') !== null &&
        securityGroupId.length >= 11 &&
        securityGroupId.length <= 20
    );
};

export const { vpc: vpcToolsContent } = TOOLS_CONTENT;

export interface ModelParamsEditorDefinition {
    label: string;
    control: (item: any, itemIndex: number) => React.JSX.Element;
    info?: React.JSX.Element;
    errorText?: (item: any) => string | null;
}

export interface AttributeEditorItem {
    key: string;
}
export type AttributeEditorItems = AttributeEditorItem[] | {}[];

export const isAttrItemsValid = (items: AttributeEditorItems, validatorFn: (i: string) => boolean) => {
    if (items.length === 0) {
        return false;
    }

    return items.every((item) => {
        return 'key' in item && validatorFn(item.key as string);
    });
};
