import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0d14',
          elevated: '#111520',
          card: '#171c2d',
          surface: '#1e2438',
          surface2: '#252b40',
        },
        accent: {
          DEFAULT: '#4f6ef7',
          hover: '#3a5ae8',
          light: '#7b9fff',
          dim: 'rgba(79,110,247,0.15)',
        },
        success: {
          DEFAULT: '#22c55e',
          dim: 'rgba(34,197,94,0.12)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          dim: 'rgba(245,158,11,0.12)',
        },
        danger: {
          DEFAULT: '#ef4444',
          dim: 'rgba(239,68,68,0.12)',
        },
        violet: {
          DEFAULT: '#a78bfa',
          dim: 'rgba(167,139,250,0.12)',
        },
        info: {
          DEFAULT: '#06b6d4',
          dim: 'rgba(6,182,212,0.12)',
        },
        border: {
          subtle: 'rgba(255,255,255,0.07)',
          default: 'rgba(255,255,255,0.12)',
          strong: 'rgba(255,255,255,0.20)',
        },
        text: {
          primary: '#e8eaf0',
          secondary: '#8b92a8',
          muted: '#555e78',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        arabic: ['Cairo', 'sans-serif'],
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '14px',
        lg: '20px',
        xl: '28px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        shimmer: 'shimmer 1.5s infinite',
        'slide-up': 'slideUp 0.3s ease',
        'fade-in': 'fadeIn 0.2s ease',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        slideUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      boxShadow: {
        'accent-glow': '0 8px 32px rgba(79,110,247,0.35)',
        card: '0 2px 16px rgba(0,0,0,0.4)',
        modal: '0 24px 64px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
