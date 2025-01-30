import React from 'react';
import { Box, FormField, Input, Select } from '@cloudscape-design/components';
import { IG_DOCS } from '@/utils/constants';
import { InfoLink } from '@/components/commons';
import { BaseFormComponentProps } from '../../interfaces';
import { KNOWLEDGE_BASE_PROVIDERS } from '../../steps-config';
import { updateNumFieldsInError } from '../../utils';
import { scoreToKendraMapping } from '../helpers';

export interface ScoreThresholdProps extends BaseFormComponentProps {
    scoreThreshold: number;
    knowledgeBaseProvider: string;
    'data-testid'?: string;
}

export const ScoreThreshold = (props: ScoreThresholdProps) => {
    let scoreThresholdErrorText: string = validateScoreThreshold(props.scoreThreshold);

    const handleScoreThresholdChange = (scoreThresholdString: string) => {
        const scoreThreshold = parseFloat(scoreThresholdString);
        props.onChangeFn({ scoreThreshold: scoreThreshold });

        const currentError = validateScoreThreshold(scoreThreshold);
        updateNumFieldsInError(currentError, scoreThresholdErrorText, props.setNumFieldsInError);
        scoreThresholdErrorText = currentError;
    };

    //different knowledge bases may wish to display score differently, so generate the form field content for each KB type
    let formFieldContent: React.JSX.Element;
    let formFieldDescription: string;
    let formFieldConstraintText: string;
    switch (props.knowledgeBaseProvider) {
        case KNOWLEDGE_BASE_PROVIDERS.bedrock:
            formFieldContent = <>{getBedrockKnowledgeBaseScoreFormFieldContent(props, handleScoreThresholdChange)}</>;
            formFieldDescription =
                'The minimum relevance score required for a document to be used. Set to 0 to perform no filtering';
            formFieldConstraintText = 'The score threshold must be between 0.0 and 1.0';
            break;
        case KNOWLEDGE_BASE_PROVIDERS.kendra:
            formFieldContent = <>{getKendraScoreFormFieldContent(props, handleScoreThresholdChange)}</>;
            formFieldDescription = 'The minimum relevance score required for a document to be used.';
            formFieldConstraintText = '';
            break;
        default:
            return '';
    }

    //render final component
    return (
        <FormField
            label="Score Threshold"
            description={formFieldDescription}
            constraintText={formFieldConstraintText}
            info={<InfoLink onFollow={() => props.setHelpPanelContent!(scoreThresholdInfoPanel)} />}
            errorText={scoreThresholdErrorText}
            data-testid={props['data-testid']}
        >
            {formFieldContent}
        </FormField>
    );
};

export default ScoreThreshold;

const validateScoreThreshold = (scoreThreshold: number) => {
    if (scoreThreshold < 0 || scoreThreshold > 1.0) {
        return 'Score threshold must be between 0.0 and 1.0';
    }
    return '';
};

const getBedrockKnowledgeBaseScoreFormFieldContent = (
    props: ScoreThresholdProps,
    changeHandler: (scoreThresholdString: string) => void
) => {
    return (
        <Input
            onChange={({ detail }) => {
                changeHandler(detail.value);
            }}
            value={props.scoreThreshold?.toString()}
            type="number"
            step={0.01}
            data-testid={props['data-testid'] + '-bedrock-input'}
        />
    );
};

const getKendraScoreFormFieldContent = (
    props: ScoreThresholdProps,
    changeHandler: (scoreThresholdString: string) => void
) => {
    const options = {
        'VERY_HIGH': { label: 'VERY_HIGH', value: '1.0' },
        'HIGH': { label: 'HIGH', value: '0.75' },
        'MEDIUM': { label: 'MEDIUM', value: '0.5' },
        'LOW': { label: 'LOW', value: '0.25' },
        //Kendra in the background refers to this state as NOT_AVAILABLE; however, in the context
        //of setting a threshold, DISABLED reads better for customers so using this nomenclature instead
        'DISABLED': { label: 'DISABLED', value: '0.0' }
    };

    let selectedOption;
    try {
        selectedOption = options[scoreToKendraMapping(props.scoreThreshold)];
    } catch (e) {
        //if the current score is not a valid score, default to disabled
        selectedOption = options['DISABLED'];
        changeHandler(options['DISABLED'].value);
    }

    return (
        <Select
            onChange={({ detail }) => {
                changeHandler(detail.selectedOption.value ?? options['DISABLED'].value);
            }}
            selectedOption={selectedOption}
            options={Object.values(options).sort((a, b) => {
                //sort in ascending order by value
                return parseFloat(a.value) - parseFloat(b.value);
            })}
            data-testid={props['data-testid'] + '-kendra-select'}
        />
    );
};

const scoreThresholdInfoPanel = {
    title: 'Score Threshold',
    content: (
        <div>
            <Box variant="p">
                Set the minimum relevance score required for a document to be returned and used by the LLM. Setting to
                0/DISABLED will result in performing no filtering meaing that all documents returned by the query will
                be used.
            </Box>
            <Box variant="p">
                Setting a threshold too high can result in too few documents being used, but too low can result in
                irrelevant documents being referenced. Experiment to find the right balance based on your dataset and
                use case.
            </Box>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.TIPS_PROMPT_LIMITS,
            text: 'Tips for managing prompt limits'
        }
    ]
};
