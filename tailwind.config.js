/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // The <alpha-value> placeholder is what makes bg-brand-primary/10,
        // hover:bg-brand-primary/90 etc. produce real CSS. See globals.css.
        brand: {
          primary: 'rgb(var(--brand-primary) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
