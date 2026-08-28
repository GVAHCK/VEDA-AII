import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        navy: '#121b30',
        brand: '#6258e8',
        mint: '#daf5eb',
      },
      boxShadow: {
        card: '0 10px 35px rgba(25,36,61,.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
