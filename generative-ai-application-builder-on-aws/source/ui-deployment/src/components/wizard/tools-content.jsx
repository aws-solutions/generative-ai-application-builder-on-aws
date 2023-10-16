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
 *********************************************************************************************************************/

import { Box, SpaceBetween } from '@cloudscape-design/components';
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
        },
        defaultUserEmail: {
            title: 'Default user email address',
            content: (
                <Box variant="p">
                    The email address of a user you want to give access to the deployment. This user (referred to as
                    Business user) will be sent an email with credentials to log in and use the deployment. If no email
                    address is provided, only other Admin users will have access to this deployment.
                </Box>
            ),
            links: [
                {
                    href: IG_DOCS.CONCEPTS,
                    text: 'Concepts and Definitions - Business user'
                },
                {
                    href: IG_DOCS.MANAGE_USERS,
                    text: 'Managing user access'
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
        },
        modelProvider: {
            title: 'Model provider',
            content: (
                <div>
                    <Box variant="p">
                        Select the model provider that hosts the LLM you wish to use for this deployment.
                    </Box>

                    <Box variant="p">
                        Amazon Bedrock is an AWS service which provides access to a collection of LLMs and is the
                        recommended integration due to the improved security posture.
                    </Box>
                </div>
            ),
            links: [
                {
                    href: IG_DOCS.SUPPORTED_LLMS,
                    text: 'Supported LLM Providers'
                },
                {
                    href: IG_DOCS.CHOOSING_LLMS,
                    text: 'Choosing the right LLM'
                },
                {
                    href: IG_DOCS.BEDROCK_SECURITY,
                    text: 'Security - Amazon Bedrock'
                },
                {
                    href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html',
                    text: 'Amazon Bedrock - Data protection'
                }
            ]
        },
        modelName: {
            title: 'Model name',
            content: (
                <div>
                    <Box variant="p">
                        Select the name of the model from the model provider to use for this deployment.
                    </Box>

                    <Box variant="p">
                        If using Amazon Bedrock, work with your DevOps administrator to ensure model access has been
                        configured in the AWS account before attempting to deploy a model from this list.
                    </Box>
                </div>
            ),
            links: [
                {
                    href: IG_DOCS.SUPPORTED_LLMS,
                    text: 'Supported Models'
                },
                {
                    href: IG_DOCS.CHOOSING_LLMS,
                    text: 'Choosing the right LLM'
                },
                {
                    href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html',
                    text: 'Amazon Bedrock - How to enable model access'
                },
                {
                    href: IG_DOCS.CONCEPTS,
                    text: 'Concepts and Definitions - DevOps user'
                }
            ]
        },
        inferenceEndpoint: {
            title: 'Hugging Face Inference Endpoints',
            content: (
                <div>
                    <Box variant="p">
                        Hugging Face recommends the use of Inference Endpoints for production deployments and are
                        required when using some of the larger models.
                    </Box>

                    <Box variant="p">
                        This solution supports the use of the Falcon and Flan-T5 family of models found in the drop down
                        list.
                    </Box>
                </div>
            ),
            links: [
                {
                    href: IG_DOCS.SUPPORTED_LLMS,
                    text: 'Supported Models'
                },
                {
                    href: IG_DOCS.CHOOSING_LLMS,
                    text: 'Choosing the right LLM'
                },
                {
                    href: IG_DOCS.THIRD_PARTY_SECURITY,
                    text: 'Security - third party LLMs'
                },
                {
                    href: 'https://huggingface.co/docs/inference-endpoints/index',
                    text: 'Hugging Face - Inference Endpoints'
                }
            ]
        },
        apiKey: {
            title: 'API key',
            content: (
                <Box variant="p">A valid API key must be supplied to enable the chat interface to work correctly.</Box>
            ),
            links: [
                {
                    href: IG_DOCS.THIRD_PARTY_SECURITY,
                    text: 'Security - third party LLMs'
                }
            ]
        },
        promptTemplate: {
            title: 'Prompt Template',
            content: (
                <div>
                    <Box variant="p">
                        Prompts are a great way to customize and control the response behaviour of an LLM. Here are the
                        following placeholders available for use in your template:
                        <ul>
                            <li>
                                <b>{'{input}'}</b> - <i>Mandatory</i> - this placeholder will be substituted with the
                                chat user's input message
                            </li>
                            <li>
                                <b>{'{history}'}</b> - <i>Mandatory</i> - this placeholder will be substituted with the
                                chat history of the session
                            </li>
                            <li>
                                <b>{'{context}'}</b> - <i>Mandatory (RAG only)</i> - this placeholder will be
                                substituted with the document excerpts obtained from the configured knowledge base
                            </li>
                        </ul>
                    </Box>

                    <Box variant="p">
                        <b>Note:</b> if no prompt template is provided here, a default prompt template will be created
                        for you. See the Review page before deploying.
                    </Box>
                </div>
            ),
            links: [
                {
                    href: IG_DOCS.TIPS_PROMPT_LIMITS,
                    text: 'Tips for managing prompt limits'
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
        },
        kendraIndex: {
            title: 'Amazon Kendra index',
            content: (
                <SpaceBetween size="xs">
                    <Box variant="p">
                        This solution can use an existing Kendra index as the knowledge base, or it can create a new one
                        for you.
                    </Box>

                    <Box variant="p">
                        If you choose to use an existing index, you will need to provide the index id, which can be
                        found on the Amazon Kendra console. Please ensure the Amazon Kendra index is active and
                        populated with your desired data.
                    </Box>

                    <Box variant="p">
                        If creating a new Amazon Kendra index for this application, please provide a name for the index.
                    </Box>

                    <Box variant="p">
                        <b>Note:</b> You may need to contact your AWS Account Administrator for help with certain
                        actions such as ingesting documents into the index or deleting resources once they are no longer
                        needed.
                    </Box>
                </SpaceBetween>
            ),
            links: [
                {
                    href: IG_DOCS.INGESTING_DATA,
                    text: 'Ingesting data into your Knowledge base'
                },
                {
                    href: IG_DOCS.CONCEPTS,
                    text: 'Concepts and Definitions - DevOps user'
                },
                {
                    href: IG_DOCS.UNINSTALL,
                    text: 'Cleaning up Kendra indexes'
                }
            ]
        },
        kendraAdditionalQueryCapacity: {
            title: 'Additional Amazon Kendra options',
            content: (
                <SpaceBetween size="xs">
                    <Box variant="h4">Kendra additional query capacity</Box>
                    <Box variant="p">
                        Amazon Kendra provides resources for your index in capacity units. Each capacity unit provides
                        additional resources for your index to use. Use this setting to adjust the query capacity for
                        your index.
                    </Box>

                    <Box variant="h4">Kendra additional storage capacity</Box>
                    <Box variant="p">Use this setting to adjust the storage capacity for your index.</Box>

                    <Box variant="h4">Kendra edition</Box>
                    <Box variant="p">
                        Amazon Kendra comes in two editions. Kendra Enterprise Edition provides a high-availability
                        service for production workloads. Kendra Developer Edition provides developers with a lower-cost
                        option to build a proof-of-concept. Use this setting to select the type of Kendra index to
                        create for this deployment.
                    </Box>
                </SpaceBetween>
            ),
            links: [
                {
                    href: 'https://docs.aws.amazon.com/kendra/latest/dg/adjusting-capacity.html',
                    text: 'Amazon Kendra - Adjusting Capacity'
                }
            ]
        },
        maxNumDocs: {
            title: 'Number of documents to retrieve',
            content: (
                <SpaceBetween size="xs">
                    <Box variant="p">
                        This setting is used to control the maximum number of document excerpts that can be used as
                        context for a single query. If the number of documents returned by the knowledge base exceeds
                        this maximum, only the max number set here will be passed through.
                    </Box>
                </SpaceBetween>
            ),
            links: [
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
