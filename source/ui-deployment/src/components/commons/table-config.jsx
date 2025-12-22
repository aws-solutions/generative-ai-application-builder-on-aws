// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { CollectionPreferences } from '@cloudscape-design/components';
import { contentDisplayPreferenceI18nStrings } from '../../i18n-strings';

export const createCfnLink = (stackId) => {
    const region = stackId.split(':')[3];
    return `https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?filteringText=&filteringStatus=active&viewNested=true&stackId=${stackId}`;
};

export const parseStackName = (stackId) => {
    try {
        return stackId.split(':').splice(-1)[0].replace('stack/', '');
    } catch (error) {
        console.error('Error parsing stack name', error);
        return '';
    }
};

export const serverSideErrorsStore = new Map();

const CONTENT_DISPLAY_OPTIONS = [
    { id: 'name', label: 'Name', alwaysVisible: true },
    { id: 'tenant', label: 'Customer / Tenant' },
    { id: 'channels', label: 'Enabled Channels' },
    { id: 'voicePhoneNumber', label: 'Voice Phone Number' },
    { id: 'stackId', label: 'Use Case ID' },
    { id: 'useCaseType', label: 'Use Case Type' },
    { id: 'status', label: 'CloudFormation Deployment Status' },
    { id: 'modelProvider', label: 'Model Provider' },
    { id: 'webUrl', label: 'CloudFront URL' },
    { id: 'dateCreated', label: 'Creation Date' }
];

export const DEFAULT_PREFERENCES = {
    contentDisplay: [
        { id: 'stackId', visible: true },
        { id: 'name', visible: true },
        { id: 'tenant', visible: true },
        { id: 'channels', visible: true },
        { id: 'voicePhoneNumber', visible: true },
        { id: 'useCaseType', visible: true },
        { id: 'status', visible: true },
        { id: 'dateCreated', visible: true },
        { id: 'modelProvider', visible: true },
        { id: 'webUrl', visible: true }
    ],
    wrapLines: false,
    stripedRows: false,
    contentDensity: 'comfortable',
    stickyColumns: { first: 0, last: 0 },
    pageSize: 10
};

export const Preferences = ({
    preferences,
    setPreferences,
    disabled,
    contentDisplayOptions = CONTENT_DISPLAY_OPTIONS
}) => (
    <CollectionPreferences
        title="Preferences"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        disabled={disabled}
        preferences={preferences}
        onConfirm={({ detail }) => setPreferences(detail)}
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
