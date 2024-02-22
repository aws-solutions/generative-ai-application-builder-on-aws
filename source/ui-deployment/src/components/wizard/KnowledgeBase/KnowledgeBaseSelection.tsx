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

import { KnowledgeBaseConfigProps } from '../interfaces/Steps';
import { KNOWLEDGE_BASE_PROVIDERS } from '../steps-config';
import { Kendra } from './providers';

export const KnowledgeBaseSelection = (props: KnowledgeBaseConfigProps) => {
    if (props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.kendra) {
        return <Kendra {...props} />;
    }
    return <div>Invalid knowledgebase type</div>;
};

export default KnowledgeBaseSelection;
