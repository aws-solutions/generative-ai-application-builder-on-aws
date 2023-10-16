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

import { Dispatch, createContext } from 'react';

import { ActionType } from '../hooks/useCreateReducer';

import { Conversation } from '../types/chat';
import { KeyValuePair } from '../types/misc';

import { HomeInitialState } from './home.state';

export interface HomeContextProps {
    state: HomeInitialState;
    dispatch: Dispatch<ActionType<HomeInitialState>>;
    handleUpdateConversation: (conversation: Conversation, data: KeyValuePair) => void;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export default HomeContext;
