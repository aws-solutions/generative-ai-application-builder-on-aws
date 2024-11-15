/* eslint-disable import/no-anonymous-default-export */
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/components/*.{js,ts,jsx,tsx}',
        './src/home/*.{js,ts,jsx,tsx}',
        './src/App.jsx',
        './src/index.jsx',
        './components/**/*.{js,ts,jsx,tsx}'
    ],
    darkMode: 'class',
    theme: {
        extend: {}
    },
    variants: {
        extend: {
            visibility: ['group-hover']
        }
    },
    plugins: [require('@tailwindcss/typography')]
};
