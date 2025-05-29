// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box } from '@cloudscape-design/components';

export const escapedNewLineToLineBreakTag = (str, componentId) => {
    try {
        return str.split('\n').map((item, index) => {
            return index === 0 ? item : [<br key={`${componentId}.${index}`} />, item]; //NOSONAR - split new line characters to html br tags once
        });
    } catch (error) {
        return '';
    }
};

export const createBox = (data) => {
    return <Box variant="p">{data}</Box>;
};