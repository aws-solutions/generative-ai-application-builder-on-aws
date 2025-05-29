// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { HomeHelp, NoHelp, ProjectsDetailsHelp, ProjectsOverviewHelp } from './HelpPanelContent.tsx';
import { Route, Routes } from 'react-router-dom';

export const ToolsContent = () => {
    return (
        <>
            <Routes>
                <Route path="/projects" element={<ProjectsOverviewHelp />} />
                <Route path="/projects/create" element={<NoHelp />} />
                <Route path="/projects/:projectId" element={<ProjectsDetailsHelp />} />
                <Route path="/" element={<HomeHelp />} />
                <Route path="*" element={<NoHelp></NoHelp>} />
            </Routes>
        </>
    );
};
