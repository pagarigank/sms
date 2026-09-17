import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        // --- semantic surfaces (grades) ---
        'surface-base': 'hsl(var(--surface-base))',
        'surface-raised': 'hsl(var(--surface-raised))',
        'surface-overlay': 'hsl(var(--surface-overlay))',
        'surface-muted': 'hsl(var(--surface-muted))',
        'surface-input': 'hsl(var(--surface-input))',
        // --- accent helpers ---
        'accent-subtle': 'hsl(var(--accent-subtle))',
        'accent-ink': 'hsl(var(--accent-ink))',
        'secondary-subtle': 'hsl(var(--secondary-subtle))',
        'secondary-ink': 'hsl(var(--secondary-ink))',
        // --- status pairs (surface + ink) ---
        'status-success': 'hsl(var(--status-success-ink))',
        'status-warning': 'hsl(var(--status-warning-ink))',
        'status-danger': 'hsl(var(--status-danger-ink))',
        'status-info': 'hsl(var(--status-info-ink))',
        'status-neutral': 'hsl(var(--status-neutral-ink))',
        'status-success-surface': 'hsl(var(--status-success-surface))',
        'status-warning-surface': 'hsl(var(--status-warning-surface))',
        'status-danger-surface': 'hsl(var(--status-danger-surface))',
        'status-info-surface': 'hsl(var(--status-info-surface))',
        'status-neutral-surface': 'hsl(var(--status-neutral-surface))',
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'slide-up-fade': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'dot-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.7)', opacity: '0.55' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'progress-shrink': {
          from: { width: '100%' },
          to: { width: '0%' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'slide-up-fade': 'slide-up-fade 0.25s ease-out both',
        'scale-in': 'scale-in 0.22s ease-out both',
        'dot-pulse': 'dot-pulse 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 4s ease infinite',
        'progress-shrink': 'progress-shrink linear both',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
