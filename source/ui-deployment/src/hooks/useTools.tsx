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
 **********************************************************************************************************************/

import { HelpPanel, AppLayoutProps } from '@cloudscape-design/components';
import { useState, useRef } from 'react';
import { ExternalLinkGroup } from '../components/commons';
import { ToolHelpPanelContent } from '../components/wizard/interfaces/Steps';
import { TOOLS_CONTENT } from '../components/wizard/tools-content';

interface ToolsContent {
    [key: string]: { [key: string]: ToolHelpPanelContent };
}

const getDefaultToolsUsingStateKey = (stateKey: string) => {
    return (TOOLS_CONTENT as ToolsContent)[stateKey].default;
};

const getFormattedToolsContent = (tools: ToolHelpPanelContent) => (
    <HelpPanel header={<h2>{tools.title}</h2>} footer={<ExternalLinkGroup items={tools.links} />}>
        {tools.content}
    </HelpPanel>
);

export const useTools = (stepStateKey: string) => {
    const [toolsContent, setToolsContent] = useState(
        getFormattedToolsContent(getDefaultToolsUsingStateKey(stepStateKey))
    );
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const appLayoutRef = useRef<AppLayoutProps.Ref>();

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
        toolsContent,
        isToolsOpen,
        setHelpPanelContent,
        closeTools,
        setFormattedToolsContent,
        onToolsChange,
        appLayoutRef
    };
};

export default useTools;
