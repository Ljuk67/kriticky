import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

const thumbs = import.meta.glob('../assets/thumbs/*.svg', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>;

export function isVisibleBlogPost(post: BlogEntry, prod = import.meta.env.PROD): boolean {
  return !prod || post.data.status === 'published';
}

export function getVisibleBlogPosts(posts: BlogEntry[], prod = import.meta.env.PROD): BlogEntry[] {
  return posts.filter((post) => isVisibleBlogPost(post, prod));
}

export function sortBlogPostsByDateDesc<T extends BlogEntry>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getVisibleSortedBlogPosts(prod = import.meta.env.PROD): Promise<BlogEntry[]> {
  return sortBlogPostsByDateDesc(getVisibleBlogPosts(await getCollection('blog'), prod));
}

export async function resolveBlogThumb(id: string): Promise<string> {
  const key = `../assets/thumbs/${id}.svg`;
  const fallback = `../assets/thumbs/default.svg`;
  const loader = thumbs[key] || thumbs[fallback];
  return loader();
}

export async function withBlogThumbs<T extends { id: string }>(
  posts: T[],
): Promise<Array<T & { thumb: string }>> {
  return Promise.all(posts.map(async (post) => ({ ...post, thumb: await resolveBlogThumb(post.id) })));
}
