/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: { headline: ['Manrope', 'serif'], body: ['Manrope', 'sans-serif'] },
      colors: {
        background: '#0a0a0a', surface: '#0a0a0a',
        'surface-container-low': '#141413', 'surface-container-high': '#1e1e1c', 'surface-container-highest': '#282826',
        'surface-container-lowest': '#050504',
        primary: '#f2ca50', 'primary-container': '#d4af37', 'on-primary': '#1c1400',
        secondary: '#c3f400', 'secondary-container': '#8aa600',
        'on-surface': '#e5e2d8', 'on-surface-variant': '#a8a39a',
        outline: '#6b665d', 'outline-variant': '#3d3a34',
      },
    },
  },
  plugins: [],
}
