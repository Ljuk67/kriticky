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
          },
        },
        lg: {
          css: {
            fontSize: '1em', // keep prose-lg at body size; headings still scale
            lineHeight: '1.45',
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
