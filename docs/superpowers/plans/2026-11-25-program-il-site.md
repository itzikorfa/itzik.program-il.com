# program-il.com Personal Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A console-styled static personal site for Yizhak (Itzik) Orfanian at program-il.com, with an intro, tagged GitHub projects, a blog, a "worth reading" list, AI-friendly extras, and a Git-based `/admin` editor. It's hosted on AWS Amplify.

**Architecture:** Astro static output. Content is Markdown/YAML in the repo, read through Astro content collections. Projects come from the GitHub API at build time, with a committed JSON snapshot as the fallback. Amplify builds on every push to `main`, and a GitHub Actions workflow triggers daily and manual rebuilds through an Amplify webhook. Sveltia CMS is served as static files at `/admin` and commits to the repo.

**Tech Stack:** Astro 7.x, TypeScript, Vitest (unit), Playwright (e2e), `@astrojs/rss`, `@astrojs/sitemap`, Sveltia CMS (CDN), AWS Amplify Hosting, Route 53, GitHub Actions, ImprovMX.

**Spec:** `docs/superpowers/specs/2026-11-25-program-il-site-design.md`

## Global Constraints

- English only.
- **Never published (site or repo):** the owner's phone number, any Gmail address, his home town, and any `*.doc`/`*.docx`. The exact phone/town strings are never written in tracked files, not even in tests or docs. They live only in the untracked `.private-patterns` file (see below).
- Contact shown: LinkedIn `https://www.linkedin.com/in/oitzik/`, GitHub `https://github.com/itzikorfa`, email `hi@program-il.com`. Location at most "Israel".
- Projects: only public repos of `itzikorfa` with topic `portfolio`, and never forks.
- Static output only, so all content must be present in the HTML without JavaScript. The typing animation is enhancement only and is disabled under `prefers-reduced-motion`.
- WCAG AA text contrast. No horizontal scroll at 360px width. Tap targets ≥ 44px tall on mobile.
- AI **training** crawlers are blocked by default through a single switch, `ALLOW_AI_TRAINING = false`. Search engines and AI search/answer bots are allowed.
- Secrets (GitHub token, Amplify webhook URL) live only in Amplify env vars or GitHub Actions secrets, never in the repo.
- `program-il.com` is connected only after the owner's explicit OK on staging.
- AWS work uses the owner's new admin profile, not root.
- Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **GitHub API down or rate-limited during a build:** the build still succeeds and shows the snapshot list. Pinned by `github.test.ts › falls back to snapshot on HTTP 403` (Task 3).
2. **Zero `portfolio`-tagged repos:** the Projects section shows a friendly empty state instead of a blank or broken section. Pinned by `github.test.ts › returns [] when none tagged` and `home.spec.ts › projects empty state` (Task 3).
3. **A repo with no description or language** (common in his account): the row renders without "null"/"undefined". Pinned by `github.test.ts › normalizes missing description` (Task 3).
4. **Draft post or future-dated post** created in `/admin`: not listed, has no page, and isn't in RSS, sitemap or llms.txt. Pinned by `blog.spec.ts › draft is not published` (Task 4).
5. **Long unbroken strings** (URLs in reading notes, long repo names) on a 360px phone: no horizontal scroll. Pinned by `home.spec.ts › no horizontal scroll at 360px` with a long-URL fixture (Task 5).

---

## File Structure

```
astro.config.mjs            site URL, sitemap integration, static output
package.json                scripts: dev, build, preview, test, test:e2e
.gitignore                  node_modules, dist, .astro, *.doc, *.docx, .superpowers/, .impeccable/, .env*, .rebuild-url, .private-patterns
amplify.yml                 Amplify build spec
rebuild.sh                  POSTs to $AMPLIFY_WEBHOOK_URL (env or untracked .rebuild-url)
.github/workflows/rebuild.yml   cron daily 03:00 UTC + workflow_dispatch → webhook
src/config/site.ts          SITE_URL, SITE_INDEXABLE (env), ALLOW_AI_TRAINING, bot lists, buildRobots()
src/data/profile.ts         all intro/experience/skills/contact copy (single source)
src/data/projects.snapshot.json  last known portfolio repos (committed fallback)
src/lib/github.ts           fetchPortfolioRepos()
src/lib/posts.ts            isPublished(), getPublishedPosts()
src/content.config.ts       collections: blog (md), reading (yaml)
src/content/blog/*.md       posts
src/content/reading.yaml    curated links
src/styles/terminal.css     tokens + terminal styles
src/layouts/Terminal.astro  page shell: window chrome, command bar, meta/OG, JSON-LD
src/components/CommandBar.astro + src/scripts/typing.ts
src/components/{Whoami,Experience,Projects,BlogList,Reading,Contact}.astro
src/pages/index.astro, blog/[slug].astro, blog/[slug].md.ts, rss.xml.ts,
          llms.txt.ts, llms-full.txt.ts, robots.txt.ts, 404.astro
public/admin/index.html, public/admin/config.yml
public/images/blog/         CMS uploads
tests/unit/*.test.ts, tests/e2e/*.spec.ts, tests/fixtures/
```

Shared test helper `tests/forbidden.ts` exports `FORBIDDEN: RegExp[]` = `[/@gmail\.com/i, /\+972[-\s]?\d/]` plus one case-insensitive literal pattern per non-empty line of the untracked `.private-patterns` file, if present. Claude creates that file locally in Task 1, with the phone number and home town copied from the CV, and never commits or prints its contents. It's used by every "no private data" check.

---

### Task 1: Scaffold, repo hygiene, content schema

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/content.config.ts`, `src/content/blog/hello-world.md`, `src/content/reading.yaml`, `vitest.config.ts`, `playwright.config.ts`, `tests/forbidden.ts`, `tests/unit/hygiene.test.ts`
- Do NOT add the CV file.

**Interfaces:**
- Produces: collection `blog` with schema `{ title: string; date: Date; summary: string; tags: string[] (default []); draft: boolean (default false) }`. Collection `reading` from `src/content/reading.yaml`, an array of `{ title: string; url: string (url); date: Date; note: string }`.
- Produces: `FORBIDDEN: RegExp[]` from `tests/forbidden.ts`.

- [ ] **Step 1:** `git init` in `/Users/iziaman/prj/website`, then write `.gitignore` with: `node_modules/ dist/ .astro/ *.doc *.docx .superpowers/ .impeccable/ .env* .rebuild-url .private-patterns test-results/ playwright-report/`.
- [ ] **Step 2:** Scaffold Astro (minimal template, TypeScript strict) in place. Add dev deps `vitest`, `@playwright/test`, `@astrojs/rss`, `@astrojs/sitemap`, `yaml`. `astro.config.mjs`: `site: 'https://program-il.com'`, `output: 'static'`, sitemap integration.
- [ ] **Step 3: Write failing test** `tests/unit/hygiene.test.ts`:
  - `gitignore excludes CV and private patterns`: `.gitignore` has lines `*.doc`, `*.docx` and `.private-patterns`.
  - `private patterns loaded locally`: when `.private-patterns` exists, `FORBIDDEN.length >= 4`.
  - `no private data tracked`: no file in `git ls-files` (excluding `tests/forbidden.ts`) matches any `FORBIDDEN` pattern, and no tracked path ends in `.doc`/`.docx`.
- [ ] **Step 4:** Run `npx vitest run tests/unit/hygiene.test.ts`. It should FAIL.
- [ ] **Step 5:** Define the collections in `src/content.config.ts` (glob loader for `src/content/blog/*.md`, file loader for `reading.yaml`). Seed `hello-world.md` (`title: "Hello, world"`, `summary: "Why I built program-il.com"`, short body the owner will edit) and `reading.yaml` with `[]`.
- [ ] **Step 6:** `git add -A`, then run `npx vitest run` → PASS, and `npx astro build` → succeeds.
- [ ] **Step 7:** Commit `chore: scaffold Astro site with content collections`. Verify `git ls-files | grep -i '\.doc'` prints nothing.

### Task 2: Profile data, terminal layout, home page shell

**Files:**
- Create: `src/data/profile.ts`, `src/config/site.ts`, `src/styles/terminal.css`, `src/layouts/Terminal.astro`, `src/components/{CommandBar,Whoami,Experience,Contact}.astro`, `src/scripts/typing.ts`, `src/pages/index.astro`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Produces: `profile`. `{ name: "Yizhak (Itzik) Orfanian"; title: "Senior Software Developer"; tagline: "Cloud Security & AI"; about: string[]; experience: {role, org, period, line}[]; skills: {group, items: string[]}[]; certifications: string[]; education: {degree, school, years, note?}[]; links: { linkedin, github, email: "hi@program-il.com" } }`. The copy comes verbatim from the spec section "Content (from CV)".
- Produces: `site.ts` exports `SITE_URL = 'https://program-il.com'`, `SITE_INDEXABLE = import.meta.env.SITE_INDEXABLE === 'true'`, `ALLOW_AI_TRAINING = false`, `AI_TRAINING_BOTS: string[]`, `ALLOWED_BOTS: string[]` (lists copied from the spec "Crawler policy").
- Produces: `Terminal.astro` props `{ title: string; description: string; path: string; ogType?: 'website'|'article'; jsonLd?: object; noindex?: boolean }`. It emits a canonical URL `SITE_URL + path`, OG/Twitter tags, `<meta name="robots" content="noindex">` when `noindex || !SITE_INDEXABLE`, and a JSON-LD `<script>` when given.
- Section anchors (used by CommandBar, the 404 page and later tasks): `#about`, `#projects`, `#blog`, `#reading`, `#contact`.

- [ ] **Step 1: Write failing e2e tests** `tests/e2e/home.spec.ts` (Playwright against `astro preview`, projects iPhone 13, Pixel 7, Desktop Chrome, and a 360×740 viewport):
  - `shows name and title`: h1 text is `Yizhak (Itzik) Orfanian`, and the page contains `Senior Software Developer`.
  - `command bar jumps to sections`: clicking the button `projects` brings `#projects` into the viewport. Same for about, blog, reading and contact.
  - `content visible without JS`: with `javaScriptEnabled: false`, all five anchors exist and are visible.
  - `no private data`: the HTML matches no `FORBIDDEN` pattern and has `a[href="mailto:hi@program-il.com"]`.
  - `contact links`: hrefs to `https://www.linkedin.com/in/oitzik/` and `https://github.com/itzikorfa` exist.
  - `no horizontal scroll at 360px`: `document.documentElement.scrollWidth <= 360`.
  - `tap targets`: every command button and contact button has bounding height ≥ 44 on the iPhone project.
  - `reduced motion skips typing`: with `reducedMotion: 'reduce'`, after clicking `blog` the prompt line shows the full `ls blog/` text immediately.
  - `Person JSON-LD`: the `application/ld+json` script parses to `@type: "Person"`, `name`, `jobTitle`, `worksFor.name: "Check Point Software Technologies"`, and `sameAs` with both profile URLs.
- [ ] **Step 2:** Run `npx playwright test tests/e2e/home.spec.ts`. It should FAIL.
- [ ] **Step 3:** Implement. Dark GitHub-like palette as CSS custom properties in `terminal.css` (AA contrast), monospace font. Prompt `itzik@program-il:~$` on desktop and `$` at ≤ 640px. Window chrome shows on desktop only. Each command button is a real `<a href="#section">`, and `typing.ts` adds the typed-prompt effect unless reduced motion is set. Contact links are full-width buttons on mobile. Projects, Blog and Reading render placeholder sections with their anchors for now.
- [ ] **Step 4:** Run → PASS. Commit `feat: terminal layout and home page intro`.

### Task 3: Portfolio projects from GitHub

**Files:**
- Create: `src/lib/github.ts`, `src/data/projects.snapshot.json`, `src/components/Projects.astro`, `tests/unit/github.test.ts`
- Modify: `src/pages/index.astro`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Produces: `type Repo = { name: string; description: string | null; language: string | null; url: string; stars: number }`.
- Produces: `fetchPortfolioRepos(opts: { user: string; token?: string; fetchImpl?: typeof fetch; snapshot: Repo[] }): Promise<Repo[]>`. It calls `GET https://api.github.com/users/{user}/repos?per_page=100&type=owner`, keeps the repos where `!fork && topics.includes('portfolio')`, maps each to `Repo`, and sorts by stars desc then name. On a network error or non-2xx response it returns `snapshot` and logs a warning. On success it returns the live list, even an empty one. When env `GITHUB_API_OFFLINE=1` is set, it returns `snapshot` without fetching (used by e2e).
- `Projects.astro` calls it with `user: 'itzikorfa'` and `token: import.meta.env.GITHUB_TOKEN`.

- [ ] **Step 1: Write failing tests** `tests/unit/github.test.ts` with a stub `fetchImpl`:
  - `filters to portfolio topic and excludes forks`: 3 input repos (tagged, untagged, tagged fork) give only the tagged non-fork.
  - `falls back to snapshot on HTTP 403`: the result deep-equals the snapshot.
  - `falls back to snapshot on network error`: a throwing fetch gives the snapshot.
  - `returns [] when none tagged`: with a 200 response and no tagged repos, the result is `[]`.
  - `normalizes missing description`: `description: null` and `language: null` stay `null`.
  - `sends auth header when token given`: the request has `Authorization: Bearer t`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/github.test.ts`. It should FAIL.
- [ ] **Step 3:** Implement `fetchPortfolioRepos` and `Projects.astro`. It renders as `ls projects/`, one tappable row per repo with the name, plus description and language only when present, plus stars only when > 0. With 0 repos it renders `# no projects tagged yet`. Seed `projects.snapshot.json` with `[]`.
- [ ] **Step 4:** Add the e2e test `projects empty state`: with a build under `GITHUB_API_OFFLINE=1` and the empty snapshot, `#projects` contains `no projects tagged yet`, and no row contains `null` or `undefined`.
- [ ] **Step 5:** Run unit and e2e → PASS. Commit `feat: portfolio projects from GitHub topic`.

### Task 4: Blog, Markdown twins, RSS

**Files:**
- Create: `src/lib/posts.ts`, `src/components/BlogList.astro`, `src/pages/blog/[slug].astro`, `src/pages/blog/[slug].md.ts`, `src/pages/rss.xml.ts`, `tests/unit/posts.test.ts`, `tests/e2e/blog.spec.ts`, `tests/fixtures/blog/draft-post.md`
- Modify: `src/pages/index.astro`, `astro.config.mjs` (sitemap filter)

**Interfaces:**
- Produces: `isPublished(data: { draft: boolean; date: Date }, now: Date): boolean` and `getPublishedPosts(now?: Date): Promise<CollectionEntry<'blog'>[]>` (newest first). **Every** blog consumer uses `getPublishedPosts`: list, pages, md twins, RSS, sitemap filter, llms.txt.
- Post URL: `/blog/{id}/`. Markdown twin: `/blog/{id}.md`, which returns `# {title}`, a date and summary line, then the raw body, with `Content-Type: text/markdown; charset=utf-8`.

- [ ] **Step 1: Write failing tests:**
  - unit `posts.test.ts › excludes drafts and future posts`: draft → false, a future date → false, a past non-draft → true.
  - e2e `post page renders`: `/blog/hello-world/` has h1 `Hello, world`, `og:type` `article`, and `BlogPosting` JSON-LD with `author.name` `Yizhak (Itzik) Orfanian` and `datePublished`.
  - e2e `markdown twin`: `/blog/hello-world.md` → 200, the body starts with `# Hello, world`, and the content type contains `text/markdown`.
  - e2e `rss lists published posts`: `/rss.xml` contains `Hello, world`.
  - e2e `draft is not published`: the e2e build script copies `tests/fixtures/blog/draft-post.md` (`draft: true`) into `src/content/blog/` before building and removes it after. Then `/blog/draft-post/` → 404, and the home page, `/rss.xml`, `/sitemap-0.xml` and (after Task 6) `/llms.txt` don't contain `draft-post`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. On the home page, `BlogList` shows the latest 5 as `ls blog/` rows (`date  slug.md`, with the summary under it on mobile). The post page uses a long-form reading layout: max ~70ch, body ≥ 16px, same palette, and a `$ cat <slug>.md` header line.
- [ ] **Step 4:** Run → PASS. Commit `feat: blog posts, markdown twins and RSS`.

### Task 5: Worth reading list

**Files:**
- Create: `src/components/Reading.astro`, `tests/fixtures/reading.long.yaml`
- Modify: `src/pages/index.astro`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: the `reading` collection (Task 1).

- [ ] **Step 1: Write failing e2e:**
  - `reading renders items`: with a fixture of 2 items, `#reading` shows both titles as external links (`target="_blank" rel="noopener"`) with the date and note.
  - `reading empty state`: with the empty seed, it shows `# nothing here yet`.
  - Run `no horizontal scroll at 360px` again with `reading.long.yaml`, which has a 200-character URL in the note and a 60-character title. The fixture is swapped in by the e2e build script, the same way as Task 4.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement as `cat reading.txt` output, newest first. Apply `overflow-wrap: anywhere` to notes and titles.
- [ ] **Step 4:** Run → PASS. Commit `feat: worth reading list`.

### Task 6: AI-friendly files and crawler policy

**Files:**
- Create: `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts`, `src/pages/robots.txt.ts`, `tests/unit/robots.test.ts`, `tests/e2e/ai.spec.ts`
- Modify: `src/config/site.ts`

**Interfaces:**
- Produces: `buildRobots(opts: { indexable: boolean; allowTraining: boolean }): string` in `site.ts`.
- Consumes: `profile`, `getPublishedPosts`, `fetchPortfolioRepos`, `ALLOW_AI_TRAINING`, `SITE_INDEXABLE`, bot lists.

- [ ] **Step 1: Write failing tests:**
  - unit `blocks training bots by default`: `buildRobots({indexable:true, allowTraining:false})` has, for each name in `AI_TRAINING_BOTS` (including `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`), a `User-agent: <name>` group with `Disallow: /`. It has `User-agent: *` with `Disallow: /admin/`, and `Sitemap: https://program-il.com/sitemap-index.xml`.
  - unit `training switch`: with `allowTraining:true` there are no `Disallow: /` groups for training bots. `Disallow: /admin/` stays.
  - unit `staging blocks everything`: with `indexable:false`, the output is exactly `User-agent: *\nDisallow: /\n`.
  - e2e `llms.txt`: 200, starts with `# Yizhak (Itzik) Orfanian`, has a `> ` summary line, `## Blog` linking `https://program-il.com/blog/hello-world.md`, `## Projects`, and `## Links` with LinkedIn and GitHub, and matches no `FORBIDDEN` pattern.
  - e2e `llms-full.txt`: contains the full body text of `hello-world.md`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement following the llms.txt convention (H1, blockquote summary, H2 link lists). Put a comment directly above `ALLOW_AI_TRAINING` in `site.ts`: `// Owner switch: set to true to allow AI training crawlers, then push.`
- [ ] **Step 4:** Run → PASS. Commit `feat: llms.txt, markdown twins, crawler policy`.

### Task 7: Console 404 page

**Files:** Create `src/pages/404.astro`. Modify `tests/e2e/home.spec.ts`.

- [ ] **Step 1:** Write the failing e2e `404 page`: `/nope/` in preview → status 404, shows `command not found: nope` (path taken client-side, with a static `command not found` fallback without JS), links to the five home anchors, and has `noindex`.
- [ ] **Step 2:** Run → FAIL. Implement with `Terminal.astro` (`noindex`). Run → PASS.
- [ ] **Step 3:** Commit `feat: console 404 page`.

### Task 8: `/admin` editor (Sveltia CMS)

**Files:**
- Create: `public/admin/index.html`, `public/admin/config.yml`, `tests/unit/cms-config.test.ts`, `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: the collection schemas from Task 1. CMS fields must match them exactly.

- [ ] **Step 1: Write failing tests:**
  - unit `cms config matches content schema`: parse `config.yml`. The backend is `{ name: github, repo: itzikorfa/program-il.com, branch: main }`. `media_folder: public/images/blog`, `public_folder: /images/blog`. Collection `blog` has folder `src/content/blog`, `create: true`, and fields `title, date, summary, tags, draft, body` with `draft` default `true`. A file collection `reading` points at `src/content/reading.yaml`, with a list field whose items are `title, url, date, note`.
  - e2e `admin page`: `/admin/` → 200 with `<meta name="robots" content="noindex, nofollow">` and a viewport meta. The home page has no link to `/admin`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. `index.html` loads `https://unpkg.com/@sveltia/cms@0.273.0/dist/sveltia-cms.js` (pinned). New posts default to `draft: true`, so nothing goes live by accident.
- [ ] **Step 4:** Run → PASS. Commit `feat: /admin editor with Sveltia CMS`.

### Task 9: Owner review gate 1 (local preview)

- [ ] **Step 1:** `npm run build && npm run preview`, then open `http://localhost:4321` for the owner at desktop size and phone size (DevTools device mode: iPhone 14, Pixel 7).
- [ ] **Step 2:** Walk through the home page, a post, `/llms.txt` and the 404 page. Apply feedback as small commits, updating tests where behavior changes.
- [ ] **Step 3:** Get the owner's explicit "looks good locally" before Task 10.

### Task 10: GitHub repo, Amplify staging, rebuild triggers

**Files:**
- Create: `amplify.yml`, `.github/workflows/rebuild.yml`, `rebuild.sh`, `README.md` (how to post via `/admin` or a Markdown file, how to tag a project, how to rebuild, where the AI-training switch is)

**Interfaces:**
- Amplify env vars: `GITHUB_TOKEN` (fine-grained, read-only public metadata), `SITE_INDEXABLE=false` until Task 12.
- GitHub Actions secret: `AMPLIFY_WEBHOOK_URL`.

- [ ] **Step 1:** `amplify.yml`: `npm ci` → `npm run build`, artifacts `dist`, cache `node_modules`. `rebuild.yml`: `on: schedule: - cron: '0 3 * * *'` plus `workflow_dispatch`, with one step `curl -fsS -X POST -H 'Content-Type: application/json' -d '{}' "$AMPLIFY_WEBHOOK_URL"`. `rebuild.sh`: same curl, URL from `$AMPLIFY_WEBHOOK_URL` or the first line of `.rebuild-url`, which exits 1 with `Set AMPLIFY_WEBHOOK_URL or create .rebuild-url` if neither is set. Make it executable.
- [ ] **Step 2:** **Confirm with the owner first**, then `gh repo create itzikorfa/program-il.com --public --source . --push`. Before pushing, verify the hygiene test passes and `git ls-files` has no `.doc` files.
- [ ] **Step 3:** With the owner's admin AWS profile, in us-east-1, create the Amplify app connected to `main` with the env vars above. The owner authorizes the Amplify GitHub App in the browser. Create the incoming webhook, then `gh secret set AMPLIFY_WEBHOOK_URL`, and write the URL to the untracked `.rebuild-url`.
- [ ] **Step 4: Verify:** the first build is green. `curl -s https://main.<id>.amplifyapp.com/robots.txt` shows `Disallow: /`, and the home page has `noindex`. Running the "Rebuild" workflow manually (`gh workflow run rebuild.yml`) and `./rebuild.sh` each add a job to `aws amplify list-jobs`.
- [ ] **Step 5:** The owner creates a fine-grained PAT (only `itzikorfa/program-il.com`, Contents read/write) and signs in at `https://main.<id>.amplifyapp.com/admin/`. They create a test post as a draft and confirm it isn't on the site, then publish it. **Verify:** a commit lands on `main`, a build runs, and the post appears. Then delete it through the CMS.
- [ ] **Step 6:** Commit `ci: Amplify build, daily and manual rebuild`.

### Task 11: Owner review gate 2 (staging on a real phone)

- [ ] **Step 1:** The owner opens the staging URL on their own phone and checks the home page, command buttons, a post, the contact buttons and `/admin`.
- [ ] **Step 2:** Apply feedback. Before Task 12, get an explicit "go live" from the owner.

### Task 12: Connect program-il.com, email alias, go live

- [ ] **Step 1:** Amplify domain management: add `program-il.com` (Route 53 zone `Z1033648316G4NJR1IOQU`) with the apex as the main domain and a `www` → apex redirect. Wait until the certificate status is **AVAILABLE**.
- [ ] **Step 2:** Set `SITE_INDEXABLE=true` in Amplify and rebuild. **Verify:** `curl -sI https://program-il.com` → 200, `curl -sI https://www.program-il.com` → 301 to the apex, and `/robots.txt` shows the training-bot blocks plus `Disallow: /admin/`.
- [ ] **Step 3: Email.** The owner creates a free ImprovMX account and sets the alias `hi` → their personal inbox themselves, in ImprovMX's site. Add MX records `10 mx1.improvmx.com` and `20 mx2.improvmx.com`, plus TXT `"v=spf1 include:spf.improvmx.com ~all"`, to the zone. **Verify:** `dig MX program-il.com +short` lists both, and a test email from another account to `hi@program-il.com` arrives.
- [ ] **Step 4:** Check the deployed site for private data: fetch `/`, `/llms.txt`, `/llms-full.txt` and `/rss.xml`, and none matches a `FORBIDDEN` pattern.
- [ ] **Step 5:** Refresh `src/data/projects.snapshot.json` from the live API (after the owner has tagged repos), then commit `chore: refresh projects snapshot`. Tell the owner the site is live.
