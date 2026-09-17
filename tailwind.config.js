/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1F2A44',
        accent: '#2E7D6B',
        warning: '#B45309',
        danger: '#B91C1C',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        'text-primary': '#1A1A1A',
        'text-secondary': '#6B7280',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
