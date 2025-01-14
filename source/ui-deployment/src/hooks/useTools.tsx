// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { HelpPanel, AppLayoutProps } from '@cloudscape-design/components';
import { useState, useRef } from 'react';
import { ExternalLinkGroup } from '../components/commons';
import { ToolHelpPanelContent } from '../components/wizard/interfaces/Steps';
import { BaseWizardStep } from '@/components/wizard/interfaces/Steps/BaseWizardStep';

const getFormattedToolsContent = (tools: ToolHelpPanelContent) => (
    <HelpPanel header={<h2>{tools.title}</h2>} footer={<ExternalLinkGroup items={tools.links} />}>
        {tools.content}
    </HelpPanel>
);

const generateTools = (content: ToolHelpPanelContent) => {
    const [toolsContent, setToolsContent] = useState(getFormattedToolsContent(content));
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const appLayoutRef = useRef<AppLayoutProps.Ref>(null);

    const setFormattedToolsContent = (tools: ToolHelpPanelContent) => {
        setToolsContent(getFormattedToolsContent(tools));
    };

    const setHelpPanelContent = (tools: ToolHelpPanelContent) => {
        if (tools) {
            setFormattedToolsContent(tools);
        }
        setIsToolsOpen(true);
        appLayoutRef.current?.focusToolsClose();
    };
    const closeTools = () => setIsToolsOpen(false);

    const onToolsChange = (evt: AppLayoutProps.ChangeDetail) => setIsToolsOpen(evt.open);

    return {
        content: toolsContent,
        isOpen: isToolsOpen,
        setContentAndOpen: setHelpPanelContent,
        close: closeTools,
        setContent: setFormattedToolsContent,
        onChange: onToolsChange,
        appLayoutRef: appLayoutRef
    };
};

export const generateToolsForStep = (step: BaseWizardStep) => {
    return generateTools(step.toolContent);
};
