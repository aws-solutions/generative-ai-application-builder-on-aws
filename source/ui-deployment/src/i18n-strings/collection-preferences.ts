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

import { CollectionPreferencesProps } from '@cloudscape-design/components';

export const contentDisplayPreferenceI18nStrings: Partial<CollectionPreferencesProps.ContentDisplayPreference> = {
    liveAnnouncementDndStarted: (position, total) => `Picked up item at position ${position} of ${total}`,
    liveAnnouncementDndDiscarded: 'Reordering canceled',
    liveAnnouncementDndItemReordered: (initialPosition, currentPosition, total) =>
        initialPosition === currentPosition
            ? `Moving item back to position ${currentPosition} of ${total}`
            : `Moving item to position ${currentPosition} of ${total}`,
    liveAnnouncementDndItemCommitted: (initialPosition, finalPosition, total) =>
        initialPosition === finalPosition
            ? `Item moved back to its original position ${initialPosition} of ${total}`
            : `Item moved from position ${initialPosition} to position ${finalPosition} of ${total}`,
    dragHandleAriaDescription:
        "Use Space or Enter to activate drag for an item, then use the arrow keys to move the item's position. To complete the position move, use Space or Enter, or to discard the move, use Escape.",
    dragHandleAriaLabel: 'Drag handle'
};
