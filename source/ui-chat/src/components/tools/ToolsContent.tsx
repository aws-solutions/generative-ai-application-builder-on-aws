// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useSelector } from 'react-redux';
import { HomeHelp, NoHelp, FileUploadHelp, ProjectsDetailsHelp, ProjectsOverviewHelp } from './HelpPanelContent.tsx';
import { Route, Routes } from 'react-router-dom';
import { getMultimodalEnabledState } from '../../store/configSlice';
import { RootState } from '../../store/store';

export const ToolsContent = () => {
    const isMultimodalEnabled = useSelector((state: RootState) => getMultimodalEnabledState(state));

    return (
        <>
            <Routes>
                <Route path="/projects" element={<ProjectsOverviewHelp />} />
                <Route path="/projects/create" element={<NoHelp />} />
                <Route path="/projects/:projectId" element={<ProjectsDetailsHelp />} />
                <Route path="/" element={<HomeHelp />} />
                <Route path="*" element={isMultimodalEnabled ? <FileUploadHelp /> : <NoHelp />} />
            </Routes>
        </>
    );
};
