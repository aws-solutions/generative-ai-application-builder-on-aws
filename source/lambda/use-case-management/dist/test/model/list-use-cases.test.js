"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const list_use_cases_1 = require("../../model/list-use-cases");
describe('When creating a list cases adapter', () => {
    it('Should create a ListUseCasesAdapter instance correctly', () => {
        const event = {
            queryStringParameters: {
                pageSize: '10'
            },
            headers: {
                Authorization: 'Bearer 123'
            }
        };
        const adaptedEvent = new list_use_cases_1.ListUseCasesAdapter(event);
        expect(adaptedEvent.event).toEqual(event);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdC11c2UtY2FzZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rlc3QvbW9kZWwvbGlzdC11c2UtY2FzZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7QUFFeEgsK0RBQWlFO0FBR2pFLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7SUFDaEQsRUFBRSxDQUFDLHdEQUF3RCxFQUFFLEdBQUcsRUFBRTtRQUM5RCxNQUFNLEtBQUssR0FBRztZQUNWLHFCQUFxQixFQUFFO2dCQUNuQixRQUFRLEVBQUUsSUFBSTthQUNqQjtZQUNELE9BQU8sRUFBRTtnQkFDTCxhQUFhLEVBQUUsWUFBWTthQUM5QjtTQUN3QixDQUFDO1FBRTlCLE1BQU0sWUFBWSxHQUFHLElBQUksb0NBQW1CLENBQUMsS0FBd0IsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7IExpc3RVc2VDYXNlc0FkYXB0ZXIgfSBmcm9tICcuLi8uLi9tb2RlbC9saXN0LXVzZS1jYXNlcyc7XG5pbXBvcnQgeyBBUElHYXRld2F5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcblxuZGVzY3JpYmUoJ1doZW4gY3JlYXRpbmcgYSBsaXN0IGNhc2VzIGFkYXB0ZXInLCAoKSA9PiB7XG4gICAgaXQoJ1Nob3VsZCBjcmVhdGUgYSBMaXN0VXNlQ2FzZXNBZGFwdGVyIGluc3RhbmNlIGNvcnJlY3RseScsICgpID0+IHtcbiAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICBwYWdlU2l6ZTogJzEwJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICBBdXRob3JpemF0aW9uOiAnQmVhcmVyIDEyMydcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBhcyBQYXJ0aWFsPEFQSUdhdGV3YXlFdmVudD47XG5cbiAgICAgICAgY29uc3QgYWRhcHRlZEV2ZW50ID0gbmV3IExpc3RVc2VDYXNlc0FkYXB0ZXIoZXZlbnQgYXMgQVBJR2F0ZXdheUV2ZW50KTtcbiAgICAgICAgZXhwZWN0KGFkYXB0ZWRFdmVudC5ldmVudCkudG9FcXVhbChldmVudCk7XG4gICAgfSk7XG59KTtcbiJdfQ==