// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { exec } from 'node:child_process';

function thumbsWatcherPlugin() {
    let debounceTimer = null;
    const run = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            exec('node scripts/run-thumbs-if-stale.mjs', (err, stdout, stderr) => {
                if (stdout) console.log(stdout.trim());
                if (stderr) console.error(stderr.trim());
                if (err) console.error('[gen:thumbs] Error:', err.message);
            });
        }, 300);
    };
    return {
        name: 'thumbs-watcher',
        apply: 'serve',
        configureServer(server) {
            const onChange = (p) => {
                if (p.includes('/src/content/blog/') || p.includes('src\\content\\blog\\')) run();
            };
            server.watcher.on('add', onChange);
            server.watcher.on('change', onChange);
            server.watcher.on('unlink', onChange);
        },
        buildStart() {
            // Also ensure generation at build start in dev build pipelines
            run();
        },
    };
}

import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';

// https://astro.build/config
// Configure site/base for GitHub Pages vs custom domain
const isPages = process.env.DEPLOY_TARGET === 'pages';

export default defineConfig({
    site: isPages ? 'https://ljuk67.github.io/kriticky' : 'https://kriticky.sk',
    base: isPages ? '/kriticky/' : '/',
    integrations: [mdx(), sitemap(), sentry(), spotlightjs()],
    vite: {
        plugins: [thumbsWatcherPlugin()],
    },
});
