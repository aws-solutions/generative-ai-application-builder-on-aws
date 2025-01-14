// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import '@testing-library/jest-dom';
import { beforeAll, vi } from 'vitest';
import { Auth } from 'aws-amplify';
import { mockedAuthenticator } from './src/utils/test-utils';

globalThis.jest = vi;

vi.mock('aws-amplify');

beforeAll(() => {
    Auth.currentAuthenticatedUser = mockedAuthenticator();
});
