import { Button, Container, Header, SpaceBetween } from '@cloudscape-design/components';
import { PromptDetails } from '@/components/useCaseDetails/PromptDetails';
import { ReviewSectionProps } from '../interfaces/Steps';
import { createConversationMemoryApiParams, createLLMParamsApiParams } from '../utils';
import { WIZARD_PAGE_INDEX } from '../steps-config';

interface PromptReviewProps extends ReviewSectionProps {
    modelData: any;
    promptData: any;
    isRag: boolean;
    'data-testid': string;
}

export const PromptReview = (props: PromptReviewProps) => {
    const llmParamsPayload = createLLMParamsApiParams(props.modelData, props.promptData, props.isRag);
    const memoryParamsPayload = createConversationMemoryApiParams(props.promptData);
    const deployment = {
        ...llmParamsPayload,
        ...memoryParamsPayload
    };

    return (
        <SpaceBetween size="xs" data-testid={props['data-testid']}>
            <Header
                variant="h3"
                actions={<Button onClick={() => props.setActiveStepIndex(WIZARD_PAGE_INDEX.PROMPT)}>Edit</Button>}
            >
                {props.header}
            </Header>
            <Container>
                <PromptDetails selectedDeployment={deployment} />
            </Container>
        </SpaceBetween>
    );
};

export default PromptReview;
