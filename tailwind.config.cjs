/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx,vue,svelte}',
  ],
  theme: {
    extend: {
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            fontSize: '1em', // inherit body size (20px from global.css)
            lineHeight: '1.45',
            h1: { fontSize: 'clamp(2.2rem, 4vw + 1.2rem, 3.2rem)', lineHeight: '1.1' },
            h2: { fontSize: 'clamp(1.9rem, 3vw + 1rem, 2.6rem)', lineHeight: '1.15' },
            h3: { fontSize: 'clamp(1.6rem, 2.2vw + 0.9rem, 2.1rem)', lineHeight: '1.2' },
            h4: { fontSize: 'clamp(1.35rem, 1.8vw + 0.8rem, 1.7rem)', lineHeight: '1.25' },
            h5: { fontSize: 'clamp(1.15rem, 1vw + 0.8rem, 1.4rem)', lineHeight: '1.3' },
            h6: { fontSize: 'clamp(1rem, 0.5vw + 0.85rem, 1.1rem)', lineHeight: '1.3' },
          },
        },
        lg: {
          css: {
            fontSize: '1em', // keep prose-lg at body size; headings still scale
            lineHeight: '1.45',
            h1: { fontSize: 'clamp(2.2rem, 4vw + 1.2rem, 3.2rem)', lineHeight: '1.1' },
            h2: { fontSize: 'clamp(1.9rem, 3vw + 1rem, 2.6rem)', lineHeight: '1.15' },
            h3: { fontSize: 'clamp(1.6rem, 2.2vw + 0.9rem, 2.1rem)', lineHeight: '1.2' },
            h4: { fontSize: 'clamp(1.35rem, 1.8vw + 0.8rem, 1.7rem)', lineHeight: '1.25' },
            h5: { fontSize: 'clamp(1.15rem, 1vw + 0.8rem, 1.4rem)', lineHeight: '1.3' },
            h6: { fontSize: 'clamp(1rem, 0.5vw + 0.85rem, 1.1rem)', lineHeight: '1.3' },
            'li': { marginTop: '0.4em', marginBottom: '0.4em' },
          },
        },
      }),
    },
  },
  // Keep existing styles intact; enable utilities without Tailwind's CSS reset
  corePlugins: { preflight: false },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
