import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts, isoDate } from '../../lib/posts';
import { profile } from '../../data/profile';

export const getStaticPaths: GetStaticPaths = async () =>
  (await getPublishedPosts()).map((post) => ({ params: { slug: post.id }, props: { post } }));

export const GET: APIRoute = ({ props }) => {
  const { post } = props as { post: Awaited<ReturnType<typeof getPublishedPosts>>[number] };
  const md = `# ${post.data.title}\n\n_${isoDate(post.data.date)} · ${profile.name}_\n\n> ${post.data.summary}\n\n${(post.body ?? '').trim()}\n`;
  return new Response(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
