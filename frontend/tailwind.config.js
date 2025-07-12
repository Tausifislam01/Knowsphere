/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000',
          light: '#333333',
          dark: '#000000',
        },
        secondary: {
          DEFAULT: '#1a1a1a',
          light: '#2d2d2d',
          dark: '#0d0d0d',
        },
        accent: {
          DEFAULT: '#ffffff',
          light: '#f2f2f2',
          dark: '#e6e6e6',
        },
        danger: {
          DEFAULT: '#e74c3c',
          light: '#ff6b5b',
          dark: '#c0392b',
        },
      },
    },
  },
  plugins: [],
}