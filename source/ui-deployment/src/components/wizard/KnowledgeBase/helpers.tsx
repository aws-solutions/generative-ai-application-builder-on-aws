import { IG_DOCS } from '@/utils/constants';
import { Box, SpaceBetween } from '@cloudscape-design/components';

/**
 * Utility function to convert a numeric relevency score to a Kendra score
 * @param {number} score
 * @returns {string} Kendra score
 */
export const scoreToKendraMapping = (score: number) => {
    if (score < 0 || score > 1.0) {
        throw new Error('Score expected to be between 0 and 1');
    }

    if (score == 1.0) {
        return 'VERY_HIGH';
    } else if (score >= 0.75) {
        return 'HIGH';
    } else if (score >= 0.5) {
        return 'MEDIUM';
    } else if (score >= 0.25) {
        return 'LOW';
    } else {
        //Kendra in the background refers to this state as NOT_AVAILABLE; however, in the context
        //of setting a threshold, DISABLED reads better for customers so using this nomenclature instead
        return 'DISABLED';
    }
};

export const knowledgeBaseInfoPanel = {
    default: {
        title: 'Knowledge base selection',
        content: (
            <div>
                <Box variant="p">
                    Use this page to configure a knowledge base to enable <b>Retrieval Augmented Generation (RAG)</b>.
                    Connecting a knowledge base to the deployment enables it to source additional information to pass
                    onto the LLM. Disabling RAG uses the LLM as is.
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
                    This solution can use an existing Kendra index as the knowledge base, or it can create a new one for
                    you.
                </Box>

                <Box variant="p">
                    If you choose to use an existing index, you will need to provide the index id, which can be found on
                    the Amazon Kendra console. Please ensure the Amazon Kendra index is active and populated with your
                    desired data.
                </Box>

                <Box variant="p">
                    If creating a new Amazon Kendra index for this application, please provide a name for the index.
                </Box>

                <Box variant="p">
                    <b>Note:</b> You may need to contact your AWS Account Administrator for help with certain actions
                    such as ingesting documents into the index or deleting resources once they are no longer needed.
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
                href: IG_DOCS.CLEANUP_KENDRA,
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
                    additional resources for your index to use. Use this setting to adjust the query capacity for your
                    index.
                </Box>

                <Box variant="h4">Kendra additional storage capacity</Box>
                <Box variant="p">Use this setting to adjust the storage capacity for your index.</Box>

                <Box variant="h4">Kendra edition</Box>
                <Box variant="p">
                    Amazon Kendra comes in two editions. Kendra Enterprise Edition provides a high-availability service
                    for production workloads. Kendra Developer Edition provides developers with a lower-cost option to
                    build a proof-of-concept. Use this setting to select the type of Kendra index to create for this
                    deployment.
                </Box>
            </SpaceBetween>
        ),
        links: [
            {
                href: 'https://docs.aws.amazon.com/kendra/latest/dg/adjusting-capacity.html',
                text: 'Amazon Kendra - Adjusting Capacity'
            }
        ]
    }
};
