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

import { Box, ExpandableSection, SpaceBetween } from '@cloudscape-design/components';
import { KnowledgeBaseConfigProps } from '../../../interfaces/Steps';
import { KendraEdition } from './KendraEdition';
import { KendraQueryCapacity } from './KendraQueryCapacity';
import { KendraStorageCapacity } from './KendraStorageCapacity';

type AdditionalKendraOptionsProps = KnowledgeBaseConfigProps;

export const AdditionalKendraOptions = (props: AdditionalKendraOptionsProps) => {
    return (
        <Box data-testid="additional-kendra-options">
            <ExpandableSection headerText="Additional kendra options" variant="footer">
                <SpaceBetween size="l">
                    <KendraEdition {...props} />
                    <KendraQueryCapacity {...props} />
                    <KendraStorageCapacity {...props} />
                </SpaceBetween>
            </ExpandableSection>
        </Box>
    );
};

export default AdditionalKendraOptions;
