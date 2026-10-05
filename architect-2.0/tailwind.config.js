/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        dark: {
          bg:     '#070a12',
          panel:  '#0d1322',
          card:   '#121a2d',
          border: '#1f2d48',
          hover:  '#1a263e',
        },
        accent: {
          cyan:    '#06b6d4',
          purple:  '#a855f7',
          emerald: '#10b981',
          amber:   '#f59e0b',
          rose:    '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
