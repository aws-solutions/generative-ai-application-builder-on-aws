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
import { CollectionPreferences } from '@cloudscape-design/components';
import { contentDisplayPreferenceI18nStrings } from '../../i18n-strings';

export const createCfnLink = (stackId) => {
    const region = stackId.split(':')[3];
    return `https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?filteringText=&filteringStatus=active&viewNested=true&stackId=${stackId}`;
};

export const parseStackName = (stackId) => {
    const stackName = stackId.split(':').splice(-1)[0].replace('stack/', '');
    return stackName;
};

export const serverSideErrorsStore = new Map();

const CONTENT_DISPLAY_OPTIONS = [
    { id: 'name', label: 'Name', alwaysVisible: true },
    { id: 'stackId', label: 'Deployment Stack ID' },
    { id: 'status', label: 'CloudFormation Deployment Status' },
    { id: 'modelProvider', label: 'Model Provider' },
    { id: 'webUrl', label: 'CloudFront URL' },
    { id: 'dateCreated', label: 'Creation Date' }
];

export const DEFAULT_PREFERENCES = {
    pageSize: 30,
    contentDisplay: [
        { id: 'stackId', visible: true },
        { id: 'name', visible: true },
        { id: 'status', visible: true },
        { id: 'dateCreated', visible: true },
        { id: 'modelProvider', visible: true },
        { id: 'webUrl', visible: true }
    ],
    wrapLines: false,
    stripedRows: false,
    contentDensity: 'comfortable',
    stickyColumns: { first: 0, last: 0 }
};

export const PAGE_SIZE_OPTIONS = [
    { value: 10, label: '10 Deployments' },
    { value: 30, label: '30 Deployments' },
    { value: 50, label: '50 Deployments' }
];

export const Preferences = ({
    preferences,
    setPreferences,
    disabled,
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    contentDisplayOptions = CONTENT_DISPLAY_OPTIONS
}) => (
    <CollectionPreferences
        title="Preferences"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        disabled={disabled}
        preferences={preferences}
        onConfirm={({ detail }) => setPreferences(detail)}
        pageSizePreference={{
            title: 'Page size',
            options: pageSizeOptions
        }}
        wrapLinesPreference={{
            label: 'Wrap lines',
            description: 'Select to see all the text and wrap the lines'
        }}
        stripedRowsPreference={{
            label: 'Striped rows',
            description: 'Select to add alternating shaded rows'
        }}
        contentDensityPreference={{
            label: 'Compact mode',
            description: 'Select to display content in a denser, more compact mode'
        }}
        contentDisplayPreference={{
            title: 'Column preferences',
            description: 'Customize the columns visibility and order.',
            options: contentDisplayOptions,
            ...contentDisplayPreferenceI18nStrings
        }}
        stickyColumnsPreference={{
            firstColumns: {
                title: 'Stick first column(s)',
                description: 'Keep the first column(s) visible while horizontally scrolling the table content.',
                options: [
                    { label: 'None', value: 0 },
                    { label: 'First column', value: 1 },
                    { label: 'First two columns', value: 2 }
                ]
            },
            lastColumns: {
                title: 'Stick last column',
                description: 'Keep the last column visible while horizontally scrolling the table content.',
                options: [
                    { label: 'None', value: 0 },
                    { label: 'Last column', value: 1 }
                ]
            }
        }}
    />
);
