import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /*
       * Font stacks live here, not in CSS classes, so that font-sans,
       * font-mono and font-display (and @apply of them) all produce the right
       * family. Tailwind's defaults stay on the end as fallbacks while the
       * web fonts load, or if they fail to.
       */
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Epilogue', 'Inter', ...defaultTheme.fontFamily.sans],
        mono: ['"Geist Mono"', ...defaultTheme.fontFamily.mono],
      },
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
