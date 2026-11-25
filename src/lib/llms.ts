import { getCollection } from 'astro:content';
import { profile } from '../data/profile';
import { SITE_URL } from '../config/site';
import { getPublishedPosts, postMarkdownUrl, isoDate } from './posts';
import { fetchPortfolioRepos, type Repo } from './github';
import snapshot from '../data/projects.snapshot.json';

const abs = (p: string) => new URL(p, SITE_URL).href;

/** llms.txt (https://llmstxt.org): H1, blockquote summary, then H2 link lists. */
export async function buildLlmsTxt(full = false): Promise<string> {
  const posts = await getPublishedPosts();
  const reading = (await getCollection('reading')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const repos = await fetchPortfolioRepos({
    user: 'itzikorfa',
    token: import.meta.env.GITHUB_TOKEN,
    snapshot: snapshot as Repo[],
    offline: import.meta.env.GITHUB_API_OFFLINE === '1',
  });

  const out: string[] = [];
  out.push(`# ${profile.name}`, '');
  out.push(`> ${profile.title} (${profile.tagline}) based in ${profile.location}. ${profile.about.join(' ')}`, '');
  out.push('## About', '');
  for (const e of profile.experience) out.push(`- ${e.role}, ${e.org} (${e.period}): ${e.line}`);
  for (const e of profile.education) out.push(`- ${e.degree}, ${e.school} (${e.years})${e.note ? `: ${e.note}` : ''}`);
  out.push(`- Skills: ${profile.skills.map((s) => s.items.join(', ')).join('; ')}`);
  out.push(`- Certifications: ${profile.certifications.join(', ')}`, '');

  out.push('## Blog', '');
  if (posts.length === 0) out.push('- No posts yet.');
  for (const p of posts) out.push(`- [${p.data.title}](${abs(postMarkdownUrl(p.id))}): ${isoDate(p.data.date)}. ${p.data.summary}`);
  out.push('');

  out.push('## Projects', '');
  if (repos.length === 0) out.push(`- See ${profile.links.github}`);
  for (const r of repos) out.push(`- [${r.name}](${r.url})${r.description ? `: ${r.description}` : ''}`);
  out.push('');

  out.push('## Links', '');
  out.push(`- [LinkedIn](${profile.links.linkedin})`, `- [GitHub](${profile.links.github})`, `- Email: ${profile.links.email}`, `- [Website](${SITE_URL}/)`, '');

  if (reading.length > 0) {
    out.push('## Optional', '');
    for (const { data } of reading) out.push(`- [${data.title}](${data.url}): recommended reading. ${data.note}`);
    out.push('');
  }

  if (full) {
    for (const p of posts) {
      out.push('---', '', `# ${p.data.title}`, '', `_${isoDate(p.data.date)}_ · ${abs(postMarkdownUrl(p.id))}`, '', (p.body ?? '').trim(), '');
    }
  }
  return out.join('\n');
}
