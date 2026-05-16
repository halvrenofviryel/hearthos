import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans, "Inter")', 'system-ui', 'sans-serif'],
        serif: ['"Iowan Old Style"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
