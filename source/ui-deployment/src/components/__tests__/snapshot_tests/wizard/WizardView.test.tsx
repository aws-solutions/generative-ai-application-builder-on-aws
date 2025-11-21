// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { mockReactMarkdown, snapshotWithProvider } from '@/utils';
import { TextUseCaseType } from '@/components/wizard/interfaces/UseCaseTypes/Text';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

vi.mock('@cloudscape-design/components');

let WizardView: any;
mockReactMarkdown();
WizardView = (await import('../../../wizard/WizardView')).default;

test('Snapshot test', async () => {
    const tree = snapshotWithProvider(<WizardView useCase={new TextUseCaseType()} />, USECASE_TYPE_ROUTE.TEXT).toJSON();
    expect(tree).toMatchSnapshot();
});
