// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ListUseCasesAdapter, UseCaseRecord } from '../list-use-cases';
import { UseCaseTypes } from '../../utils/constants';
import { tracer } from '../../power-tools-init';
import { ListUseCasesCommand } from './use-case-command';

/**
 * Command to list Workflow use cases
 */
export class ListWorkflowCommand extends ListUseCasesCommand {
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###listWorkflowCommand' })
    public async execute(operation: ListUseCasesAdapter): Promise<any> {
        return await super.execute(operation);
    }

    /**
     * Filters use cases to only include Workflow type
     */
    protected filterUseCasesByType(useCaseRecords: UseCaseRecord[]): UseCaseRecord[] {
        return useCaseRecords.filter((record) => record.UseCaseType === UseCaseTypes.WORKFLOW);
    }
}