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

import { IconCheck, IconClipboard } from '@tabler/icons-react';
import { FC, memo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface Props {
    language: string;
    value: string;
}

export const CodeBlock: FC<Props> = memo(({ language, value }) => {
    const [isCopied, setIsCopied] = useState<boolean>(false);

    const copyToClipboard = () => {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            return;
        }

        navigator.clipboard.writeText(value).then(() => {
            setIsCopied(true);

            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        });
    };

    return (
        <div>
            <div className="flex justify-between">
                <span className="text-xs lowercase text-white">{language}</span>

                <div className="flex" data-testid="codeblock-button-copy-div">
                    <button
                        className="flex gap-1.5 items-center rounded text-xs"
                        onClick={copyToClipboard}
                        data-testid="codeblock-button-copy"
                    >
                        {isCopied ? <IconCheck size={18} /> : <IconClipboard size={18} />}
                        {isCopied ? 'Copied!' : 'Copy code'}
                    </button>
                </div>
            </div>

            <SyntaxHighlighter language={language} style={oneDark} customStyle={{ margin: 0 }}>
                {value}
            </SyntaxHighlighter>
        </div>
    );
});
CodeBlock.displayName = 'CodeBlock';
