import type { Config } from 'tailwindcss';

import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
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
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
