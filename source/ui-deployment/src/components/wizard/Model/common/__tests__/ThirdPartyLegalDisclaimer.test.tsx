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

import { ThirdPartyLegalDisclaimer } from '../ThirdPartyLegalDisclaimer';
import { cloudscapeRender } from '@/utils';
import { LEGAL_DISCLAIMER } from '@/utils/constants';
import { screen } from '@testing-library/react';

describe('ThirdPartyLegalDisclaimer', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<ThirdPartyLegalDisclaimer />);
        expect(screen.getByTestId('third-party-disclaimer-alert')).toBeDefined();

        expect(cloudscapeWrapper.findAlert()?.findContent()?.getElement().innerHTML).toContain(LEGAL_DISCLAIMER);
    });
});
