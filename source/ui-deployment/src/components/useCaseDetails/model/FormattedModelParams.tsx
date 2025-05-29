// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ValueWithLabel } from '../../../utils/ValueWithLabel';
import { ReactNode } from 'react';

interface ModelParamsProps {
    modelParams: any[];
}

/**
 * Renders a formatted display of model parameters
 * @param {Object} props - Component props
 * @param {Object} props.modelParams - Object containing model parameters where each key is the parameter name
 *                                    and value is an object with a Value property
 * @returns {ReactNode[]} Array of ValueWithLabel components for model parameters
 */
export const FormattedModelParams = ({ modelParams }: ModelParamsProps): ReactNode[] => {
    const formattedItems: ReactNode[] = [];

    for (const [paramKey, paramValueWithType] of Object.entries(modelParams)) {
        formattedItems.push(
            <ValueWithLabel key={paramKey} label={paramKey}>
                {paramValueWithType.Value}
            </ValueWithLabel>
        );
    }

    return formattedItems;
};
