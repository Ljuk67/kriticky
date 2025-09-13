/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}',
  ],
  theme: {
    extend: {
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      }),
    },
  },
  // Keep existing styles intact; enable utilities without Tailwind's CSS reset
  corePlugins: { preflight: false },
  plugins: [require('@tailwindcss/typography')],
};
