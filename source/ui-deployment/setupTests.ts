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
import '@testing-library/jest-dom';
import { beforeAll, vi } from 'vitest';
import { Auth } from 'aws-amplify';
import { mockedAuthenticator } from './src/utils/test-utils';

globalThis.jest = vi;

vi.mock('aws-amplify');
beforeAll(() => {
    Auth.currentAuthenticatedUser = mockedAuthenticator();
});
