/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        border: {
          default: 'var(--border-default)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          positive: 'var(--accent-positive)',
          danger: 'var(--accent-danger)',
          info: 'var(--accent-info)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        }
      }
    },
  },
  plugins: [],
}
