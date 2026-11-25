// Opens a pull request that adds one favorite file. Safe to retry: the branch name is fixed per token.
const API = 'https://api.github.com';

export async function openFavoritePR({ token, repo, fetchImpl = fetch, branch, file, title, body }) {
  const gh = async (method, path, payload) => {
    const res = await fetchImpl(`${API}/repos/${repo}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'itzik-program-il-favorites',
        ...(payload ? { 'content-type': 'application/json' } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };
  const fail = (step, r) => { throw new Error(`GitHub ${step} failed: ${r.status} ${r.data?.message ?? ''}`.trim()); };

  const main = await gh('GET', '/git/ref/heads/main');
  if (main.status !== 200) fail('get main', main);

  const ref = await gh('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha: main.data.object.sha });
  const branchExisted = ref.status === 422;
  if (!branchExisted && ref.status !== 201) fail('create branch', ref);

  if (branchExisted) {
    const owner = repo.split('/')[0];
    const prs = await gh('GET', `/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}`);
    if (prs.status !== 200) fail('list pulls', prs);
    if (prs.data.length > 0) return { status: 'exists', url: prs.data[0].html_url };
  }

  const put = await gh('PUT', `/contents/${file.path}`, {
    message: title,
    content: Buffer.from(file.content).toString('base64'),
    branch,
  });
  // 422 on a retried branch means the file is already there from the earlier attempt.
  if (!(put.status === 201 || put.status === 200 || (branchExisted && put.status === 422))) fail('add file', put);

  const pr = await gh('POST', '/pulls', { title, head: branch, base: 'main', body });
  if (pr.status !== 201) fail('open pull request', pr);
  return { status: 'created', url: pr.data.html_url };
}
