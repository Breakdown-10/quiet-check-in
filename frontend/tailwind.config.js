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
          50: '#F0F7FF',
          100: '#E0EFFE',
          200: '#BAE0FD',
          300: '#7CC2FB',
          400: '#389FF6',
          500: '#1963B4',
          600: '#0D4FAF',
          700: '#083B87',
          800: '#062C68',
          900: '#041D46',
          950: '#021028',
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
