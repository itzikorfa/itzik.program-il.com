import { describe, it, expect, vi } from 'vitest';
import { fetchPortfolioRepos, type Repo } from '../../src/lib/github';

const apiRepo = (over: Record<string, unknown>) => ({
  name: 'x', description: 'd', language: 'Python', html_url: 'https://github.com/itzikorfa/x',
  stargazers_count: 0, fork: false, topics: [], ...over,
});
const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
const snapshot: Repo[] = [{ name: 'snap', description: null, language: null, url: 'https://github.com/itzikorfa/snap', stars: 0 }];

describe('fetchPortfolioRepos', () => {
  it('filters to portfolio topic and excludes forks', async () => {
    const fetchImpl = ok([
      apiRepo({ name: 'tagged', topics: ['portfolio'] }),
      apiRepo({ name: 'untagged' }),
      apiRepo({ name: 'fork', fork: true, topics: ['portfolio'] }),
    ]);
    const repos = await fetchPortfolioRepos({ user: 'itzikorfa', fetchImpl, snapshot });
    expect(repos.map((r) => r.name)).toEqual(['tagged']);
    expect(repos[0]).toEqual({ name: 'tagged', description: 'd', language: 'Python', url: 'https://github.com/itzikorfa/x', stars: 0 });
  });

  it('sorts by stars desc then name', async () => {
    const fetchImpl = ok([
      apiRepo({ name: 'b', topics: ['portfolio'] }),
      apiRepo({ name: 'a', topics: ['portfolio'] }),
      apiRepo({ name: 'z', topics: ['portfolio'], stargazers_count: 3 }),
    ]);
    const repos = await fetchPortfolioRepos({ user: 'itzikorfa', fetchImpl, snapshot });
    expect(repos.map((r) => r.name)).toEqual(['z', 'a', 'b']);
  });

  it('falls back to snapshot on HTTP 403', async () => {
    const fetchImpl = vi.fn(async () => new Response('rate limited', { status: 403 }));
    expect(await fetchPortfolioRepos({ user: 'itzikorfa', fetchImpl, snapshot })).toEqual(snapshot);
  });

  it('falls back to snapshot on network error', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('ENOTFOUND'); });
    expect(await fetchPortfolioRepos({ user: 'itzikorfa', fetchImpl, snapshot })).toEqual(snapshot);
  });

  it('returns [] when none tagged', async () => {
    const fetchImpl = ok([apiRepo({ name: 'untagged' })]);
    expect(await fetchPortfolioRepos({ user: 'itzikorfa', fetchImpl, snapshot })).toEqual([]);
  });

  it('normalizes missing description', async () => {
    const fetchImpl = ok([apiRepo({ topics: ['portfolio'], description: null, language: null })]);
    const [repo] = await fetchPortfolioRepos({ user: 'itzikorfa', fetchImpl, snapshot });
    expect(repo.description).toBeNull();
    expect(repo.language).toBeNull();
  });

  it('sends auth header when token given', async () => {
    const fetchImpl = ok([]);
    await fetchPortfolioRepos({ user: 'itzikorfa', token: 't', fetchImpl, snapshot });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.github.com/users/itzikorfa/repos?per_page=100&type=owner');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer t');
  });

  it('returns snapshot without fetching when offline flag set', async () => {
    const fetchImpl = ok([]);
    const repos = await fetchPortfolioRepos({ user: 'itzikorfa', fetchImpl, snapshot, offline: true });
    expect(repos).toEqual(snapshot);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
