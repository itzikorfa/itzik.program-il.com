export type Repo = {
  name: string;
  description: string | null;
  language: string | null;
  url: string;
  stars: number;
};

type ApiRepo = {
  name: string;
  description: string | null;
  language: string | null;
  html_url: string;
  stargazers_count: number;
  fork: boolean;
  topics?: string[];
};

export const PORTFOLIO_TOPIC = 'portfolio';

/**
 * Public repos of `user` tagged with the `portfolio` topic (forks excluded).
 * Never throws: on any API/network failure (or when `offline`) it returns `snapshot`,
 * so a GitHub outage can't break the site build.
 */
export async function fetchPortfolioRepos(opts: {
  user: string;
  token?: string;
  fetchImpl?: typeof fetch;
  snapshot: Repo[];
  offline?: boolean;
}): Promise<Repo[]> {
  const { user, token, fetchImpl = fetch, snapshot, offline = false } = opts;
  if (offline) return snapshot;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'program-il-site-build',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetchImpl(`https://api.github.com/users/${user}/repos?per_page=100&type=owner`, { headers });
    if (!res.ok) {
      console.warn(`[github] HTTP ${res.status}; using projects snapshot`);
      return snapshot;
    }
    const data = (await res.json()) as ApiRepo[];
    return data
      .filter((r) => !r.fork && (r.topics ?? []).includes(PORTFOLIO_TOPIC))
      .map((r) => ({
        name: r.name,
        description: r.description || null,
        language: r.language || null,
        url: r.html_url,
        stars: r.stargazers_count ?? 0,
      }))
      .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
  } catch (err) {
    console.warn(`[github] ${(err as Error).message}; using projects snapshot`);
    return snapshot;
  }
}
