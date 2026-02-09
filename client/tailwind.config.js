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
        body: ['IBM Plex Mono', 'Consolas', 'monospace'],
        display: ['Oswald', 'Impact', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
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
        },
        bg: {
          DEFAULT: '#FDFCFB',
          subtle: '#F7F5F3',
        },
        text: {
          DEFAULT: '#2D2A26',
          muted: '#6B6660',
        },
        accent: {
          DEFAULT: '#1B365D',
          light: '#E8ECF1',
        },
        border: '#E5E2DD',
        highlight: '#FF6B35',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      rotate: {
        'slight': '-0.3deg',
        'opposite': '0.2deg',
      },
      boxShadow: {
        'offset': '4px 4px 0 rgba(27, 54, 93, 0.2)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}
