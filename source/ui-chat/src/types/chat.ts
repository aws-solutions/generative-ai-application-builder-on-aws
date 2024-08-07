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
export interface Message {
    role: Role;
    content: string;
}

export interface SourceDocument {
    excerpt: string;
    location: string;
    score: string | number;
    document_title: string;
    document_id: string;
    additional_attributes: any;
}

export interface MessageWithSource extends Message {
    sourceDocuments?: SourceDocument[];
}

export type Role = 'assistant' | 'user';

export interface Conversation {
    id: string;
    name: string;
    messages: MessageWithSource[];
}
