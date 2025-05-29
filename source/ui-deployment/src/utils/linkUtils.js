// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// function to create a direct link to the Kendra console given a Kendra index id
export const createKendraConsoleLink = (region, kendraIndexId) => {
    return `https://console.aws.amazon.com/kendra/home?region=${region}#/indexes/${kendraIndexId}/details`;
};

// Note: there currently does not exist a direct link given a knowledge base ID
// the console link uses the KB name in the URL, which we do not have access to at this point
export const createBedrockKnowledgeBaseConsoleLink = (region, bedrockKnowledgeBaseId) => {
    return `https://console.aws.amazon.com/bedrock/home?region=${region}#/knowledge-bases`;
};

export const createVpcLink = (region, vpcId) => {
    return `https://console.aws.amazon.com/vpcconsole/home?region=${region}#VpcDetails:VpcId=${vpcId}`;
};