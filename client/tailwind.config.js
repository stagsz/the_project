/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Status colors
        status: {
          online: '#10B981',
          offline: '#F43F5E',
          warning: '#F59E0B',
          info: '#3B82F6',
          maintenance: '#64748B',
        },
        // Model type colors
        model: {
          classification: '#8B5CF6',
          regression: '#0EA5E9',
          anomaly: '#F97316',
          detection: '#EC4899',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
