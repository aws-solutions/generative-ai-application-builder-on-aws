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
 *********************************************************************************************************************/

import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';

const navHeader = { text: 'Generative AI Application Builder', href: '#/' };
export const navItems: SideNavigationProps['items'] = [
    {
        type: 'section',
        text: 'Deployments',
        items: [{ type: 'link', text: 'Deploy New Use Case', href: '/wizardview' }]
    }
];

const defaultOnFollowHandler: SideNavigationProps['onFollow'] = (event) => {
    // keep the locked href for our demo pages
    event.preventDefault();
};

interface NavigationProps {
    activeHref?: string;
    header?: SideNavigationProps['header'];
    items?: SideNavigationProps['items'];
    onFollowHandler?: SideNavigationProps['onFollow'];
}

export function Navigation({
    activeHref,
    header = navHeader,
    items = navItems,
    onFollowHandler = defaultOnFollowHandler
}: NavigationProps) {
    return <SideNavigation items={items} header={header} activeHref={activeHref} onFollow={onFollowHandler} />;
}
