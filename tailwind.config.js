/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Dark theme colors from PRD
        'dark-petrol': '#003135',
        'teal-dark': '#024950',
        'alert-red': '#DC2626',
        'alert-orange': '#EA580C',
        'cyan': '#0FA4AF',
        'soft-blue': '#AFDDE5',
        'glass-white': 'rgba(255, 255, 255, 0.05)',
        'glass-border': 'rgba(175, 221, 229, 0.2)',
      },
      fontFamily: {
        'primary': ['Inter', '-apple-system', 'sans-serif'],
        'mono': ['Roboto Mono', 'SF Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #003135 0%, #024950 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}