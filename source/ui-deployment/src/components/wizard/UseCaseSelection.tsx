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
    BreadcrumbGroup,
    FormField,
    Select
} from '@cloudscape-design/components';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_TRADEMARK_NAME, USECASE_SELECTION_ID, USECASE_CONFIG } from '@/utils/constants';
import { listTenants } from '@/components/customers/tenants';

interface UseCaseSelectionItemProp {
    id: string;
    name: string;
    description: string;
    icon: IconProps.Name;
}
const UseCaseSelection = () => {
    const [selectedItem, setSelectedItem] = useState(new Array<UseCaseSelectionItemProp>());
    const [tenantOptions, setTenantOptions] = useState<Array<{ label: string; value: string; description?: string }>>(
        []
    );
    const [selectedTenant, setSelectedTenant] = useState<{ label: string; value: string } | null>(null);

    const { dispatch: homeDispatch } = useContext(HomeContext);
    const navigate = useNavigate();

    useEffect(() => {
        // Load tenants for "deploy on behalf of customer"
        listTenants()
            .then((resp: any) => {
                const items = resp?.items ?? [];
                setTenantOptions(
                    items.map((t: any) => ({
                        label: t.name ?? t.tenantId,
                        value: t.tenantId,
                        description: t.slug ? `slug: ${t.slug}` : undefined
                    }))
                );
            })
            .catch(() => {
                setTenantOptions([]);
            });
    }, []);

    const handleNextClick = () => {
        const selectedId = selectedItem[0].id as USECASE_SELECTION_ID;
        const useCaseType = USECASE_CONFIG[selectedId].type;
        const route = USECASE_CONFIG[selectedId].route;

        homeDispatch({
            field: 'selectedTenantId',
            value: selectedTenant?.value ?? ''
        });
        homeDispatch({
            field: 'selectedDeployment',
            value: { UseCaseType: useCaseType }
        });
        homeDispatch({
            field: 'deploymentAction',
            value: 'CREATE'
        });

        if (route) {
            navigate(route);
        } else {
            throw new Error(`Route not implemented for use case: ${selectedId}`);
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
                    data-testid="use-case-selection-breadcrumb-group"
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
                    <Header data-testid="use-case-selection-header">What would you like to build?</Header>
                    <FormField
                        label="Customer"
                        description="Deployments must be created on behalf of a customer tenant."
                    >
                        <Select
                            placeholder="Select a customer"
                            selectedOption={selectedTenant ?? undefined}
                            onChange={({ detail }) => setSelectedTenant(detail.selectedOption as any)}
                            options={tenantOptions}
                            filteringType="auto"
                        />
                    </FormField>
                    <Cards
                        data-testid="usecase-cards"
                        cardDefinition={{
                            header: (item) => `Create ${item.name} Use Case`,
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
                                id: USECASE_SELECTION_ID.TEXT,
                                name: 'Text',
                                description:
                                    'Deploy a text based chat application using Amazon Bedrock Knowledge Bases or Amazon Kendra, with RAG capabilities.',
                                icon: 'contact' as IconProps.Name
                            },
                            {
                                id: USECASE_SELECTION_ID.AGENT,
                                name: 'Bedrock Agent',
                                description:
                                    'Deploy an agentic use case, that uses Amazon Bedrock Agents to complete tasks or automate repeated workflows.',
                                icon: 'gen-ai' as IconProps.Name
                            },
                            {
                                id: USECASE_SELECTION_ID.MCP_SERVER,
                                name: 'MCP Server',
                                description:
                                    'Deploy and manage Model Context Protocol (MCP) servers to extend AI capabilities with custom tools, resources, and integrations.',
                                icon: 'settings' as IconProps.Name
                            },
                            {
                                id: USECASE_SELECTION_ID.AGENT_BUILDER,
                                name: 'Agent Builder',
                                description:
                                    'Build and deploy AI agents using Amazon Bedrock AgentCore with custom prompts, tools, and memory capabilities.',
                                icon: 'gen-ai' as IconProps.Name
                            },
                            {
                                id: USECASE_SELECTION_ID.WORKFLOW,
                                name: 'Workflow',
                                description:
                                    'Deploy a multi-agent workflow that orchestrates specialized agents to handle complex tasks through the "Agents as Tools" pattern.',
                                icon: 'share' as IconProps.Name
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
                        disabled={selectedItem.length == 0 || !selectedTenant}
                        disabledReason={
                            selectedItem.length == 0 ? 'Select a use case type to deploy' : 'Select a customer'
                        }
                        onClick={handleNextClick}
                        data-testid="use-case-selection-next-btn"
                    >
                        Next
                    </Button>
                </SpaceBetween>
            }
        />
    );
};

export default UseCaseSelection;
