import HomeContext from '@/contexts';
import {
    SpaceBetween,
    Box,
    Cards,
    Icon,
    IconProps,
    AppLayout,
    Header,
    Button,
    BreadcrumbGroup
} from '@cloudscape-design/components';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_TRADEMARK_NAME, USECASE_TYPES, USECASE_TYPE_ROUTE } from '@/utils/constants';

interface UseCaseSelectionItemProp {
    id: string;
    name: string;
    description: string;
    icon: IconProps.Name;
}
const UseCaseSelection = () => {
    const [selectedItem, setSelectedItem] = useState(new Array<UseCaseSelectionItemProp>());

    const { dispatch: homeDispatch } = useContext(HomeContext);
    const navigate = useNavigate();

    const handleNextClick = () => {
        homeDispatch({
            field: 'selectedDeployment',
            value: { UseCaseType: USECASE_TYPES[selectedItem[0].id.toUpperCase() as keyof typeof USECASE_TYPES] }
        });
        homeDispatch({
            field: 'deploymentAction',
            value: 'CREATE'
        });

        switch (selectedItem[0].id) {
            case 'text':
                navigate(USECASE_TYPE_ROUTE.TEXT);
                break;
            case 'agent':
                navigate(USECASE_TYPE_ROUTE.AGENT);
                break;
            default:
                throw new Error('Not Implemented');
        }
    };
    return (
        <AppLayout
            data-testid="create-usecase-view-app-layout"
            navigationHide
            toolsHide
            breadcrumbs={
                <BreadcrumbGroup
                    expandAriaLabel="Show path"
                    ariaLabel="Breadcrumbs"
                    items={[
                        { text: `${APP_TRADEMARK_NAME}`, href: '/' },
                        { text: 'Create deployment', href: '/create' }
                    ]}
                    onFollow={(event) => {
                        event.preventDefault();
                        navigate(event.detail.href);
                    }}
                />
            }
            content={
                <SpaceBetween size="l">
                    <Header>What would you like to build?</Header>
                    <Cards
                        cardDefinition={{
                            header: (item) => `Create ${item.name} use case`,
                            sections: [
                                {
                                    id: 'image',
                                    content: (item) => (
                                        <Box textAlign="left">
                                            <Icon name={item.icon ?? 'anchor-link'} size="large" />
                                        </Box>
                                    ),
                                    width: 100
                                },
                                {
                                    id: 'description',
                                    header: 'Description',
                                    content: (item) => item.description,
                                    width: 100
                                }
                            ]
                        }}
                        items={[
                            {
                                id: 'text',
                                name: 'Text',
                                description:
                                    'Deploy a text based chat application using Amazon Bedrock Knowledge Bases or Amazon Kendra, with RAG capabilities.',
                                icon: 'contact' as IconProps.Name
                            },
                            {
                                id: 'agent',
                                name: 'Agent',
                                description:
                                    'Deploy an agentic use case, that uses Bedrock Agents to complete tasks or automate repeated workflows.',
                                icon: 'gen-ai' as IconProps.Name
                            }
                        ]}
                        trackBy="id"
                        selectionType="single"
                        selectedItems={selectedItem}
                        onSelectionChange={({ detail }) => setSelectedItem(detail?.selectedItems ?? [])}
                        entireCardClickable
                        cardsPerRow={[
                            {
                                cards: 2
                            }
                        ]}
                    />
                    <Button
                        variant="primary"
                        disabled={selectedItem.length == 0}
                        disabledReason="Select a use case type to deploy"
                        onClick={handleNextClick}
                    >
                        Next
                    </Button>
                </SpaceBetween>
            }
        />
    );
};

export default UseCaseSelection;
