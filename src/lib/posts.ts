import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished } from './published';

export { isPublished };

/** The only way blog posts are read: published only (no drafts, no future dates), newest first. */
export async function getPublishedPosts(now: Date = new Date()): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', ({ data }) => isPublished(data, now));
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const postUrl = (id: string) => `/blog/${id}/`;
export const postMarkdownUrl = (id: string) => `/blog/${id}.md`;
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
