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
 *********************************************************************************************************************/

import React, { useState } from 'react';
import { Box, Button, StatusIndicator, Popover, StatusIndicatorProps } from '@cloudscape-design/components';
import './styles.css';

const SUCCESS_STATUS = 'success';
const ERROR_STATUS = 'error';

interface CopyTextProps {
    copyText: string;
    copyButtonLabel: string;
    successText: string;
    errorText: string;
}

// Force function to return a promise even if it throws synchronously
// eslint-disable-next-line require-await
export async function copyToClipboard(text: string) {
    return navigator.clipboard.writeText(text);
}

export default function CopyText({ copyText, copyButtonLabel, successText, errorText }: CopyTextProps) {
    const [status, setStatus] = useState<StatusIndicatorProps.Type>(SUCCESS_STATUS);
    const [message, setMessage] = useState(successText);

    return (
        <div className={'.custom-wrapping'}>
            <Box margin={{ right: 'xxs' }} display="inline-block">
                <Popover
                    size="small"
                    position="top"
                    dismissButton={false}
                    triggerType="custom"
                    content={<StatusIndicator type={status}>{message}</StatusIndicator>}
                >
                    <Button
                        variant="inline-icon"
                        iconName="copy"
                        ariaLabel={copyButtonLabel}
                        onClick={() => {
                            copyToClipboard(copyText).then(
                                () => {
                                    setStatus(SUCCESS_STATUS);
                                    setMessage(successText);
                                },
                                () => {
                                    setStatus(ERROR_STATUS);
                                    setMessage(errorText);
                                }
                            );
                        }}
                    />
                </Popover>
            </Box>
            {copyText}
        </div>
    );
}
