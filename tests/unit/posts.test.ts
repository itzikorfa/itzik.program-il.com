import { describe, it, expect } from 'vitest';
import { isPublished } from '../../src/lib/published';

const now = new Date('2026-11-25T12:00:00Z');

describe('isPublished', () => {
  it('excludes drafts and future posts', () => {
    expect(isPublished({ draft: true, date: new Date('2026-01-01') }, now)).toBe(false);
    expect(isPublished({ draft: false, date: new Date('2026-12-01') }, now)).toBe(false);
    expect(isPublished({ draft: false, date: new Date('2026-11-25') }, now)).toBe(true);
  });

  it("uses Israel's calendar date: a post dated today shows even while UTC is still yesterday", () => {
    const lateEveningUtc = new Date('2026-11-25T23:17:00Z'); // 01:17 on Nov 26 in Israel
    expect(isPublished({ draft: false, date: new Date('2026-11-26') }, lateEveningUtc)).toBe(true);
    expect(isPublished({ draft: false, date: new Date('2026-11-27') }, lateEveningUtc)).toBe(false);
    const earlyMorningUtc = new Date('2026-11-25T21:30:00Z'); // 23:30 on Nov 25 in Israel
    expect(isPublished({ draft: false, date: new Date('2026-11-26') }, earlyMorningUtc)).toBe(false);
  });
});
