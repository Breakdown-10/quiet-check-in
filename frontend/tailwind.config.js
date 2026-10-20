/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: '#F8F6F3',
        card: '#FFFFFF',
        border: '#E5E0DA',
        primary: '#2D2A26',
        secondary: '#6B6560',
        muted: '#9B9590',
        sage: {
          50: '#F0FAF5',
          100: '#E0F2EA',
          200: '#B8E0CC',
          500: '#22956D',
          600: '#1B7A5A',
          700: '#145E45',
        },
        warmamber: {
          50: '#FFFBF5',
          100: '#FEF3E2',
          200: '#FCE4BA',
          500: '#E8A832',
          600: '#D97B2B',
          700: '#B85F1A',
          800: '#8B4513',
        },
        danger: {
          50: '#FFF5F3',
          100: '#FEE9E5',
          500: '#DC5A4A',
          600: '#C44536',
        },
      },
    },
  },
  plugins: [],
}
