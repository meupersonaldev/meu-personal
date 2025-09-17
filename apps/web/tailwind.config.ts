import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: '#D4D4D8',
        input: '#D4D4D8',
        ring: '#27DFFF',
        background: '#FFFFFF',
        foreground: '#202020',
        primary: {
          DEFAULT: '#002C4E',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F4F4F5',
          foreground: '#202020',
        },
        accent: {
          DEFAULT: '#FFF373',
          foreground: '#002C4E',
          cyan: '#27DFFF',
        },
        muted: {
          DEFAULT: '#F4F4F5',
          foreground: '#71717A',
        },
        destructive: {
          DEFAULT: '#B3261E',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#1F8A70',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#C58F00',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF',
        },
        gray: {
          50: '#F4F4F5',
          100: '#D4D4D8',
          400: '#71717A',
          600: '#3F3F46',
          900: '#111111',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'heading-1': ['20px', { lineHeight: '130%', letterSpacing: '0.4px', fontWeight: '600' }],
        'heading-2': ['20px', { lineHeight: '130%', letterSpacing: '0.4px', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '150%', letterSpacing: '0.32px', fontWeight: '400' }],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '16px',
      },
      spacing: {
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '32px',
        xl: '48px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.08)',
        DEFAULT: '0 2px 6px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config