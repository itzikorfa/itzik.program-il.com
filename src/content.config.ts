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

export const collections = { blog, reading };
