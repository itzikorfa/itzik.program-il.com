import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { parse } from 'yaml';
import { isHttpUrl } from './lib/url';

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const reading = defineCollection({
  loader: file('src/content/reading.yaml', {
    parser: (text) => {
      // file() needs an id per entry; derive it from the URL.
      return (parse(text) ?? []).map((item: { url: string }, i: number) => ({ id: `${i}-${item.url}`, ...item }));
    },
  }),
  schema: z.object({
    title: z.string(),
    url: z.string().refine(isHttpUrl, 'Must be an http(s) URL'),
    date: z.coerce.date(),
    note: z.string(),
  }),
});

// One file per favorite (added by visitor-suggestion pull requests), so parallel PRs never conflict.
const favorites = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/favorites' }),
  schema: z.object({
    title: z.string().min(1),
    url: z.string().refine(isHttpUrl, 'Must be an http(s) URL'),
    date: z.coerce.date(),
    kind: z.enum(['site', 'repo']),
    why: z.string().optional(),
    suggestedBy: z.string().optional(),
  }),
});

export const collections = { blog, reading, favorites };
