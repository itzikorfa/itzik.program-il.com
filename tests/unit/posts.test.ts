import { describe, it, expect } from 'vitest';
import { isPublished } from '../../src/lib/published';

const now = new Date('2026-11-25T12:00:00Z');

describe('isPublished', () => {
  it('excludes drafts and future posts', () => {
    expect(isPublished({ draft: true, date: new Date('2026-01-01') }, now)).toBe(false);
    expect(isPublished({ draft: false, date: new Date('2026-12-01') }, now)).toBe(false);
    expect(isPublished({ draft: false, date: new Date('2026-11-25') }, now)).toBe(true);
  });
});
