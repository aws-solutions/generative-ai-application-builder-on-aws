// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { getHeaderCounterText, getHeaderCounterServerSideText } from '../header';
import { getTextFilterCounterText } from '../text-filter';
import { renderAriaLive, paginationAriaLabels } from '../pagination';
import { baseTableAriaLabels, deploymentTableAriaLabels, deploymentEditableTableAriaLabels } from '../table';
import { contentDisplayPreferenceI18nStrings } from '../collection-preferences';

describe('i18n-strings', () => {
    describe('header', () => {
        test('getHeaderCounterText returns count with selection when items are selected', () => {
            const items = [1, 2, 3, 4, 5];
            const selectedItems = [1, 2];
            expect(getHeaderCounterText(items, selectedItems)).toBe('(2/5)');
        });

        test('getHeaderCounterText returns total count when no items are selected', () => {
            const items = [1, 2, 3];
            expect(getHeaderCounterText(items, undefined)).toBe('(3)');
        });

        test('getHeaderCounterText returns total count when selectedItems is empty', () => {
            const items = [1, 2, 3];
            expect(getHeaderCounterText(items, [])).toBe('(3)');
        });

        test('getHeaderCounterServerSideText returns count with selection', () => {
            expect(getHeaderCounterServerSideText(100, 5)).toBe('(5/100+)');
        });

        test('getHeaderCounterServerSideText returns total count when no selection', () => {
            expect(getHeaderCounterServerSideText(100, undefined)).toBe('(100+)');
        });

        test('getHeaderCounterServerSideText returns total count when selectedCount is 0', () => {
            expect(getHeaderCounterServerSideText(100, 0)).toBe('(100+)');
        });
    });

    describe('text-filter', () => {
        test('getTextFilterCounterText returns singular for 1 match', () => {
            expect(getTextFilterCounterText(1)).toBe('1 match');
        });

        test('getTextFilterCounterText returns plural for multiple matches', () => {
            expect(getTextFilterCounterText(5)).toBe('5 matches');
        });

        test('getTextFilterCounterText returns plural for 0 matches', () => {
            expect(getTextFilterCounterText(0)).toBe('0 matches');
        });
    });

    describe('pagination', () => {
        test('renderAriaLive returns correct aria text', () => {
            const result = renderAriaLive!({
                firstIndex: 1,
                lastIndex: 10,
                totalItemsCount: 50,
                visibleItemsCount: 10
            });
            expect(result).toBe('Displaying items 1 to 10 of 50');
        });

        test('paginationAriaLabels returns correct labels with total pages', () => {
            const labels = paginationAriaLabels(10);
            expect(labels.nextPageLabel).toBe('Next page');
            expect(labels.previousPageLabel).toBe('Previous page');
            expect(labels.pageLabel!(5)).toBe('Page 5 of 10');
        });

        test('paginationAriaLabels returns correct labels without total pages', () => {
            const labels = paginationAriaLabels(undefined);
            expect(labels.pageLabel!(3)).toBe('Page 3 of all pages');
        });
    });

    describe('table', () => {
        test('baseTableAriaLabels allItemsSelectionLabel returns select all', () => {
            expect(baseTableAriaLabels.allItemsSelectionLabel!()).toBe('select all');
        });

        test('deploymentTableAriaLabels itemSelectionLabel returns correct label', () => {
            const result = deploymentTableAriaLabels.itemSelectionLabel!(undefined, { id: 'test-123' });
            expect(result).toBe('select test-123');
        });

        test('deploymentTableAriaLabels selectionGroupLabel is correct', () => {
            expect(deploymentTableAriaLabels.selectionGroupLabel).toBe('Deployment selection');
        });

        test('deploymentEditableTableAriaLabels has edit labels', () => {
            const column = { header: 'Name' };
            const item = { id: 'item-1' };
            expect(deploymentEditableTableAriaLabels.activateEditLabel!(column, item)).toBe('Edit item-1 Name');
            expect(deploymentEditableTableAriaLabels.cancelEditLabel!(column)).toBe('Cancel editing Name');
            expect(deploymentEditableTableAriaLabels.submitEditLabel!(column)).toBe('Submit edit Name');
            expect(deploymentEditableTableAriaLabels.submittingEditText!()).toBe('Submitting edit');
            expect(deploymentEditableTableAriaLabels.successfulEditLabel!()).toBe('Edit successful');
        });
    });

    describe('collection-preferences', () => {
        test('liveAnnouncementDndStarted returns correct text', () => {
            expect(contentDisplayPreferenceI18nStrings.liveAnnouncementDndStarted!(1, 5)).toBe(
                'Picked up item at position 1 of 5'
            );
        });

        test('liveAnnouncementDndDiscarded returns correct text', () => {
            expect(contentDisplayPreferenceI18nStrings.liveAnnouncementDndDiscarded).toBe('Reordering canceled');
        });

        test('liveAnnouncementDndItemReordered returns same position text', () => {
            expect(contentDisplayPreferenceI18nStrings.liveAnnouncementDndItemReordered!(2, 2, 5)).toBe(
                'Moving item back to position 2 of 5'
            );
        });

        test('liveAnnouncementDndItemReordered returns new position text', () => {
            expect(contentDisplayPreferenceI18nStrings.liveAnnouncementDndItemReordered!(1, 3, 5)).toBe(
                'Moving item to position 3 of 5'
            );
        });

        test('liveAnnouncementDndItemCommitted returns same position text', () => {
            expect(contentDisplayPreferenceI18nStrings.liveAnnouncementDndItemCommitted!(2, 2, 5)).toBe(
                'Item moved back to its original position 2 of 5'
            );
        });

        test('liveAnnouncementDndItemCommitted returns different position text', () => {
            expect(contentDisplayPreferenceI18nStrings.liveAnnouncementDndItemCommitted!(1, 3, 5)).toBe(
                'Item moved from position 1 to position 3 of 5'
            );
        });
    });
});
