// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box } from '@cloudscape-design/components';
import { IG_DOCS } from '../../utils/constants';

export const TOOLS_CONTENT = {
    useCase: {
        default: {
            title: 'Deploying a new use case',
            content: <Box variant="p">Use this page to create a new deployment</Box>,
            links: [
                {
                    href: IG_DOCS.USE_CASES,
                    text: 'Learn more about use cases'
                }
            ]
        }
    },
    vpc: {
        default: {
            title: 'Select VPC Configuration',
            content: (
                <Box variant="p">
                    Use cases can be optionally deployed with a Virtual Private Cloud (VPC) configuration. Customers
                    have the option of allowing Generative AI Application Builder on AWS to create a VPC for a
                    deployment, or use an existing VPC from their AWS account. Use this page to configure the optional
                    VPC configuration to be used by the deployment.
                </Box>
            ),
            links: [
                {
                    href: IG_DOCS.VPC,
                    text: 'VPC'
                },
                {
                    href: IG_DOCS.VPC_TROUBLESHOOTING,
                    text: 'Troubleshooting VPC Errors'
                }
            ]
        }
    },
    model: {
        default: {
            title: 'Select model',
            content: <Box variant="p">Use this page to configure the LLM to be used by the deployment.</Box>,
            links: [
                {
                    href: IG_DOCS.SUPPORTED_LLMS,
                    text: 'Supported LLM Providers'
                },
                {
                    href: IG_DOCS.COST,
                    text: 'Cost'
                }
            ]
        }
    },
    knowledgeBase: {
        default: {
            title: 'Knowledge base selection',
            content: (
                <div>
                    <Box variant="p">
                        Use this page to configure a knowledge base to enable{' '}
                        <b>Retrieval Augmented Generation (RAG)</b>. Connecting a knowledge base to the deployment
                        enables it to source additional information to pass onto the LLM. Disabling RAG uses the LLM as
                        is.
                    </Box>

                    <Box variant="p">
                        RAG is a technique that leverages prompt-based learning to “train” a LLM on new information it
                        wasn’t originally trained on. Instead of using the traditional method of fine-tuning a model on
                        custom data, prompt-based learning and RAG rely on a concept called{' '}
                        <b>
                            <i>context stuffing</i>
                        </b>
                        . By “stuffing” additional “context” into your prompt, you can show the LLM new information it
                        hasn’t yet seen such as private documents, technical jargon, the latest news articles, etc.
                    </Box>
                </div>
            ),
            links: [
                {
                    href: IG_DOCS.INGESTING_DATA,
                    text: 'Ingesting data into your Knowledge base'
                }
            ]
        }
    },
    prompt: {
        default: {
            title: 'Prompt selection',
            content: <Box variant="p">Use this page to configure the prompt used by the deployment.</Box>,
            links: [
                {
                    href: IG_DOCS.CONFIGURE_PROMPTS,
                    text: 'Configuring your prompts'
                },
                {
                    href: IG_DOCS.TIPS_PROMPT_LIMITS,
                    text: 'Tips for managing prompt limits'
                }
            ]
        }
    },
    review: {
        default: {
            title: 'Review and create',
            content: <Box variant="p">Use this page to perform a final review before creating your deployment.</Box>,
            links: [
                {
                    href: IG_DOCS.USING_THE_SOLUTION,
                    text: 'Next Steps: Using the solution'
                }
            ]
        }
    }
};
