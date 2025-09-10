/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Women's health themed colors
        cycle: {
          menstrual: '#dc2626',
          follicular: '#f59e0b',
          ovulation: '#10b981',
          luteal: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
};