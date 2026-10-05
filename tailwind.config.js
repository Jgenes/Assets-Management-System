/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        mocu: {
          navy: '#0A2540',
          navyLight: '#15395B',
          blue: '#1E40AF',
          gold: '#D97706',
          goldLight: '#F59E0B',
          green: '#047857',
          greenLight: '#10B981',
          slate: '#F8FAFC',
          card: '#FFFFFF'
        }
      }
    },
  },
  plugins: [],
}
