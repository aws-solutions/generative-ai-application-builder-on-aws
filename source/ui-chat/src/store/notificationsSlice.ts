// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CaseReducer, createSlice, Slice } from '@reduxjs/toolkit';
import React from 'react';
import { RootState } from './store.ts';

/**
 * Represents the structure of a notification in the application
 * @typedef {Object} NotificationPayload
 * @property {string} id - Unique identifier for the notification
 * @property {React.ReactNode} [header] - Optional header content of the notification
 * @property {React.ReactNode} [content] - Optional main content of the notification
 * @property {'success' | 'warning' | 'info' | 'error' | 'in-progress'} type - Type of notification
 */
export type NotificationPayload = {
    id: string;
    header?: React.ReactNode;
    content?: React.ReactNode;
    type: 'success' | 'warning' | 'info' | 'error' | 'in-progress';
};

/**
 * Defines the reducer functions for notification state management
 * @typedef {Object} NotificationReducers
 */
export type NotificationReducers = {
    addNotification: CaseReducer<NotificationState, { payload: NotificationPayload; type: string }>;
    deleteNotification: CaseReducer<NotificationState, { payload: { id: string }; type: string }>;
};

/**
 * Represents the state structure for notifications
 * @typedef {Object} NotificationState
 * @property {Array<NotificationPayload>} notifications - Array of current notifications
 */
export type NotificationState = {
    notifications: Array<NotificationPayload>;
};

/**
 * Redux slice for managing notifications state
 * Contains reducers for adding and removing notifications
 */
export const notificationsSlice: Slice<NotificationState, NotificationReducers, string> = createSlice({
    name: 'notifications',
    initialState: {
        notifications: [] as Array<NotificationPayload>
    },
    reducers: {
        /**
         * Adds a new notification if one with the same ID doesn't exist
         * @param {NotificationState} state - Current notifications state
         * @param {Object} action - Action containing the notification payload
         */
        addNotification: (state, action) => {
            const notification = action.payload;
            if (!state.notifications.find((it) => it.id === notification.id)) state.notifications.push(notification);
        },
        /**
         * Removes a notification by its ID
         * @param {NotificationState} state - Current notifications state
         * @param {Object} action - Action containing the notification ID to remove
         */
        deleteNotification: (state, action) => {
            state.notifications = state.notifications.filter((it) => it.id !== action.payload.id);
        }
    }
});

/**
 * Selector to get all notifications from the root state
 * @param {RootState} state - Root application state
 * @returns {Array<NotificationPayload>} Array of notifications
 */
export const selectNotifications = (state: RootState) => state.notifications.notifications;
export const { addNotification, deleteNotification } = notificationsSlice.actions;
