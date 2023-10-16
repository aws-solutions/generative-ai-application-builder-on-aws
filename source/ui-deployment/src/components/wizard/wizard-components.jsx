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

import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import { APP_TRADEMARK_NAME } from '../../utils/constants';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import HomeContext from '../../home/home.context';

export const Breadcrumbs = () => {
    const navigate = useNavigate();

    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    const breadcrumbText =
        deploymentAction.charAt(0).toUpperCase() + deploymentAction.toLowerCase().slice(1) + ' deployment';

    return (
        <BreadcrumbGroup
            expandAriaLabel="Show path"
            ariaLabel="Breadcrumbs"
            items={[{ text: `${APP_TRADEMARK_NAME}`, href: '/' }, { text: breadcrumbText }]}
            onFollow={(event) => {
                event.preventDefault();
                navigate(event.detail.href);
            }}
        />
    );
};
