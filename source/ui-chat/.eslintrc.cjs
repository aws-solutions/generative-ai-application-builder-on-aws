// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react-hooks/recommended"
    ],
    ignorePatterns: [
        "dist",
        ".eslintrc.cjs"
    ],
    parser: "@typescript-eslint/parser",
    plugins: ["react-refresh"],
    rules: {
        "@typescript-eslint/no-unused-vars": ["off", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/no-explicit-any": ["off"],
        "react-hooks/exhaustive-deps": "off",
        "react-refresh/only-export-components": [
            "warn",
            { allowConstantExport: true }
        ]
    }
};
