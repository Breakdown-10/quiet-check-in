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
        surface: '#F4F8FC',
        card: '#FFFFFF',
        border: '#E2EAF4',
        primary: '#0F244A',
        secondary: '#5C6E84',
        muted: '#8E9BAE',
        brand: {
          50: '#F0F7FF',
          100: '#E0EFFE',
          200: '#BAE0FD',
          300: '#7CC2FB',
          400: '#389FF6',
          500: '#0066FF',
          600: '#0052CC',
          700: '#0556C8',
          800: '#0341A0',
          900: '#0B2147',
          950: '#06142E',
        },
        sage: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
        },
        warmamber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
        },
        danger: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 36, 74, 0.04), 0 1px 2px -1px rgba(15, 36, 74, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(15, 36, 74, 0.08), 0 8px 10px -6px rgba(15, 36, 74, 0.04)',
        'blue-glow': '0 8px 20px -4px rgba(0, 102, 255, 0.35)',
      }
    },
  },
  plugins: [],
};
