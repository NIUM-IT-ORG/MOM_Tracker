import type { Config } from 'tailwindcss';

/**
 * Tailwind reads the design tokens rather than redefining them. `tokens.css` is
 * lifted verbatim from the prototype and is the single source; adding a colour
 * here that is not a token is how a build starts to look almost-but-not-quite
 * like the design that was signed off.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: 'var(--navy)',
        'navy-d': 'var(--navy-d)',
        blue: 'var(--blue)',
        steel: 'var(--steel)',
        accent: 'var(--accent)',
        'accent-d': 'var(--accent-d)',
        bg: 'var(--bg)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        ice: 'var(--ice)',
        ice2: 'var(--ice2)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        review: 'var(--review)',
      },
      borderRadius: { DEFAULT: 'var(--radius)' },
      boxShadow: { card: 'var(--shadow)' },
      fontFamily: {
        serif: ['Bitter', 'Georgia', 'serif'],
        sans: ['Public Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
