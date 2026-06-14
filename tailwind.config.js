/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        rounded: ['"M PLUS Rounded 1c"', 'sans-serif'],
      },
      colors: {
        ink: '#1A1A1A',
        cream: '#FFFDF7',
        pop: {
          coral: '#FF6B6B',
          tangerine: '#FF9F45',
          sunny: '#FFD23F',
          mint: '#3DD9A0',
          turquoise: '#36C5D9',
          pink: '#FF5C9E',
          purple: '#9B6BFF',
          blue: '#5B8DEF',
        },
      },
      borderRadius: {
        pill: '9999px',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        pop: 'pop 0.25s ease-out',
        bounceIn: 'bounceIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
