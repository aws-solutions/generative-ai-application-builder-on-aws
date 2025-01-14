// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import jsonHighlight from '@cloudscape-design/code-view/highlight/json';
import { CodeView, CodeViewProps } from '@cloudscape-design/code-view';

export type JsonCodeViewProps = Omit<CodeViewProps, 'highlight'>;

export const JsonCodeView = (props: JsonCodeViewProps) => {
    return <CodeView {...props} highlight={jsonHighlight} />;
};

export default JsonCodeView;
