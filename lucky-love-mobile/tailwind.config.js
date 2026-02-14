/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#ffe6a7',
        caramel: '#99582a',
        cacao: '#432818',
        honey: '#bb9457',
        wine: '#6f1d1b',
      },
    },
  },
  plugins: [],
};
