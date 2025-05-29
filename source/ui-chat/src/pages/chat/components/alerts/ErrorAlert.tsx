// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Alert from '@cloudscape-design/components/alert';
import { Box, CopyToClipboard, SpaceBetween } from '@cloudscape-design/components';
import { TraceDetails } from '../../../../utils/validation';

/**
 * Props interface for the ErrorAlert component
 * @interface ErrorAlertProps
 * @property {number} index - Unique index for the alert
 * @property {string} [header] - Optional header text for the alert
 * @property {TraceDetails} errorMessage - Object containing trace error details
 * @property {function} formatTraceDetailsForCopy - Function to format trace details for clipboard
 */
interface ErrorAlertProps {
    index: number;
    header?: string;
    errorMessage: TraceDetails;
    formatTraceDetailsForCopy: (errorMessage: TraceDetails) => string;
}

/**
 * Component that displays error information in an alert format with trace details
 * @param {ErrorAlertProps} props - Component props
 * @param {number} props.index - Unique index for the alert
 * @param {string} [props.header] - Optional header text for the alert
 * @param {TraceDetails} props.errorMessage - Object containing trace error details
 * @param {function} props.formatTraceDetailsForCopy - Function to format trace details for clipboard
 * @returns {JSX.Element} Alert component with error details and copy functionality
 */
export const ErrorAlert = ({ index, header, errorMessage, formatTraceDetailsForCopy }: ErrorAlertProps) => {
    return (
        <Alert key={'error-alert' + index} header={header} type="error" data-testid={'error-alert' + index}>
            <SpaceBetween size="xs">
                <Box variant="p" key="error-message">
                    {errorMessage.message}
                </Box>

                <Box variant="code" key="error-details">
                    Root ID: {errorMessage.rootId}
                    {errorMessage.parentId && `\nParent ID: ${errorMessage.parentId}`}
                    {errorMessage.lineage && `\nLineage: ${errorMessage.lineage}`}
                    {`\nSampled: ${errorMessage.sampled ? 'Yes' : 'No'}`}
                </Box>

                <CopyToClipboard
                    copyButtonText="Copy Trace Id"
                    copyErrorText="Failed to copy trace Id"
                    copySuccessText="Trace ID copied"
                    textToCopy={formatTraceDetailsForCopy(errorMessage)}
                />
            </SpaceBetween>
        </Alert>
    );
};
