// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export interface BaseDetailsContainerProps {
    loadHelpPanelContent: (id: number) => void;
    selectedDeployment: any;
    runtimeConfig: any;
}
