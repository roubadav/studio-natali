/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './public/**/*.html'
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#ebe0d0',
          300: '#dcc9ad',
          400: '#c9ac86',
          500: '#b8936a',
          600: '#a67d5a',
          700: '#8a654b',
          800: '#725442',
          900: '#5f4639',
          950: '#33241c'
        },
        accent: {
          cream: '#f8f4ef',
          beige: '#e8dfd4',
          sand: '#d4c4b0',
          taupe: '#9c8b7a',
          brown: '#6b5344'
        }
      },
      fontFamily: {
        sans: ['Nunito Sans', 'system-ui', 'sans-serif'],
        display: ['Cormorant Garamond', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
};
