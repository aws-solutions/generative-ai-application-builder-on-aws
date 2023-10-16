/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/components/*.{js,ts,jsx,tsx}',
        './src/home/*.{js,ts,jsx,tsx}',
        './src/App.js',
        './src/index.js',
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
