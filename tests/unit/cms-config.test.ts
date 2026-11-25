import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const cfg = parse(readFileSync('public/admin/config.yml', 'utf8'));
const names = (fields: { name: string }[]) => fields.map((f) => f.name);

describe('cms config matches content schema', () => {
  it('uses the GitHub backend on main', () => {
    expect(cfg.backend).toMatchObject({ name: 'github', repo: 'itzikorfa/itzik.program-il.com', branch: 'main' });
    expect(cfg.media_folder).toBe('public/images/blog');
    expect(cfg.public_folder).toBe('/images/blog');
  });

  it('blog collection matches the blog schema', () => {
    const blog = cfg.collections.find((c: { name: string }) => c.name === 'blog');
    expect(blog.folder).toBe('src/content/blog');
    expect(blog.create).toBe(true);
    expect(blog.extension ?? 'md').toBe('md');
    expect(names(blog.fields)).toEqual(['title', 'date', 'summary', 'tags', 'draft', 'body']);
    expect(blog.fields.find((f: { name: string }) => f.name === 'draft').default).toBe(true);
  });

  it('reading collection edits reading.yaml as a list', () => {
    const reading = cfg.collections.find((c: { name: string }) => c.name === 'reading');
    const fileEntry = reading.files[0];
    expect(fileEntry.file).toBe('src/content/reading.yaml');
    const list = fileEntry.fields[0];
    expect(list.widget).toBe('list');
    expect(names(list.fields)).toEqual(['title', 'url', 'date', 'note']);
  });
});

describe('cms site address', () => {
  it('previews on itzik.program-il.com', () => {
    expect(cfg.site_url).toBe('https://itzik.program-il.com');
    expect(cfg.display_url).toBe('https://itzik.program-il.com');
  });
});
