import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedPosts, postUrl } from '../lib/posts';
import { profile } from '../data/profile';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: `${profile.name} · blog`,
    description: `${profile.title}, ${profile.tagline}`,
    site: context.site!,
    items: posts.map((p) => ({ title: p.data.title, pubDate: p.data.date, description: p.data.summary, link: postUrl(p.id) })),
  });
}
