// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const mockedAuthenticator = () => {
    const authMockImplementation = () => {
        return {
            getSignInUserSession: vi.fn().mockImplementation(() => {
                return {
                    getAccessToken: vi.fn().mockImplementation(() => {
                        return {
                            getJwtToken: vi.fn().mockImplementation(() => {
                                return 'fake-token';
                            })
                        };
                    })
                };
            })
        };
    };

    return vi.fn().mockImplementation(authMockImplementation);
};
