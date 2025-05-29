// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { EntityState, EntityId } from '@reduxjs/toolkit';

/**
 * When using custom slices/thunks, we have to keep of the data loading status.
 * When using RTK Query instead, that's built in and we don't need the folowing types.
 */
export enum ApiDataStatus {
    IDLE = 'IDLE',
    LOADING = 'LOADING',
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED'
}

type StatusAndError = {
    status: ApiDataStatus;
    error: string | null;
};

export type ApiDataState<EntityType, TId extends EntityId = string> = EntityState<EntityType, TId> & StatusAndError;

export const DEFAULT_INITIAL_STATE: StatusAndError = {
    status: ApiDataStatus.IDLE,
    error: null
};
