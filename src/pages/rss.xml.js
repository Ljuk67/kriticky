import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	// Only published posts go to RSS
	const posts = await getCollection('blog', ({ data }) => data.status === 'published');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
            link: `${process.env.DEPLOY_TARGET === 'pages' ? 'https://ljuk67.github.io/kriticky' : 'https://kriticky.sk'}/blog/${post.id}/`,
		})),
	});
}
