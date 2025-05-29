// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import PromptTemplate from '../PromptTemplate';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('PromptTemplate', () => {
    const dataTestId = 'testid';
    const promptExperienceProps = {
        'defaultPromptTemplate': '{history}{input}',
        'maxPromptTemplateLength': 10000,
        'rephraseQuestion': true,
        'disambiguationEnabled': true,
        'isRag': false,
        'modelProvider': 'SageMaker',
        'setPromptTemplateInError': vi.fn() as React.Dispatch<React.SetStateAction<boolean>>,
        'data-testid': dataTestId,
        'onChangeFn': vi.fn(),
        'setNumFieldsInError': vi.fn()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('render prompt template', async () => {
        const promptTemplate = '{history}{input}';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate {...promptExperienceProps} promptTemplate={promptTemplate} />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        textArea?.setTextareaValue('new value');
    });

    test('render prompt template with extra } showing an error', async () => {
        const promptTemplate = '{history}{input}}';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate {...promptExperienceProps} promptTemplate={promptTemplate} />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const promptTemplateFormField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        expect(promptTemplateFormField?.findError()).toBeDefined();
    });

    test('render prompt template with {input} showing an error for SageMaker', async () => {
        const promptTemplate = '{input}';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate {...promptExperienceProps} promptTemplate={promptTemplate} />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const promptTemplateFormField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        expect(promptTemplateFormField?.findError()?.getElement().textContent).toEqual(`Missing required placeholder '{history}'. See info panel for help or reset prompt template to default.`);
    });

    test('render prompt template with {history} showing an error for SageMaker', async () => {
        const promptTemplate = '{history}';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate {...promptExperienceProps} promptTemplate={promptTemplate} />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const promptTemplateFormField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        expect(promptTemplateFormField?.findError()?.getElement().textContent).toEqual(`Missing required placeholder '{input}'. See info panel for help or reset prompt template to default.`);
    });
    
    test('render prompt template with Bedrock model provider', async () => {
        const promptTemplate = 'This is a valid template for Bedrock';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate 
                {...promptExperienceProps} 
                promptTemplate={promptTemplate}
                modelProvider="Bedrock"
            />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const promptTemplateFormField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        expect(promptTemplateFormField?.findError()).toBeNull();
    });
    
    test('render prompt template with Bedrock model provider with unsupported {history} placeholder', async () => {
        const promptTemplate = 'This template has {history} which is unsupported in Bedrock';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate 
                {...promptExperienceProps} 
                promptTemplate={promptTemplate}
                modelProvider="Bedrock"
            />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const promptTemplateFormField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        expect(promptTemplateFormField?.findError()?.getElement().textContent).toEqual(`Remove unsupported placeholder '{history}'. The '{history}' placeholder is no longer used and message history will now be automatically added after the system prompt and before the latest user input. See info panel for help or reset prompt template to default.`);
    });
    
    test('render prompt template with Bedrock model provider with unsupported {input} placeholder', async () => {
        const promptTemplate = 'This template has {input} which is unsupported in Bedrock';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate 
                {...promptExperienceProps} 
                promptTemplate={promptTemplate}
                modelProvider="Bedrock"
            />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const promptTemplateFormField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        expect(promptTemplateFormField?.findError()?.getElement().textContent).toEqual(`Remove unsupported placeholder '{input}'. The {input} placeholder is no longer used and will now be automatically added as the last message in the prompt.`);
    });
    
    test('render RAG prompt template with Bedrock model provider missing context', async () => {
        const promptTemplate = 'This is missing context placeholder';
        const { cloudscapeWrapper } = renderWithProvider(
            <PromptTemplate 
                {...promptExperienceProps} 
                promptTemplate={promptTemplate}
                modelProvider="Bedrock"
                isRag={true}
            />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );
        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const promptTemplateFormField = cloudscapeWrapper.findFormField();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(promptTemplate);
        expect(promptTemplateFormField?.findError()?.getElement().textContent).toEqual(`Missing required placeholder '{context}'. See info panel for help or reset prompt template to default.`);
    });
});
