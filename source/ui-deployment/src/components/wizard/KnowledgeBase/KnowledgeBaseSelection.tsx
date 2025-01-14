// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { KnowledgeBaseConfigProps } from '../interfaces/Steps';
import { KNOWLEDGE_BASE_PROVIDERS } from '../steps-config';
import { Kendra } from './providers';
import { BedrockKnowledgeBase } from './providers/Bedrock';

export const KnowledgeBaseSelection = (props: KnowledgeBaseConfigProps) => {
    React.useEffect(() => {
        if (props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.bedrock) {
            props.setRequiredFields!(['bedrockKnowledgeBaseId']);
        }
        // reset the error
        props.onChangeFn({ inError: false });
    }, [props.knowledgeBaseData.knowledgeBaseType]);

    if (props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.kendra) {
        return <Kendra {...props} />;
    } else if (props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.bedrock) {
        return <BedrockKnowledgeBase {...props} />;
    }
    return <div>Invalid knowledgebase type</div>;
};

export default KnowledgeBaseSelection;
