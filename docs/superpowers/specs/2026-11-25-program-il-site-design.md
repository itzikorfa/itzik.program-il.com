# program-il.com — Personal Site Design

Date: 2026-11-25
Status: **Approved by owner 2026-11-25** (conditional on the review gate below)
Owner: Yizhak (Itzik) Orfanian

## Intent

A personal hub at **program-il.com** that introduces Itzik professionally — who he is,
what he builds, and what he's paying attention to. Visitors (recruiters, peers, the tech
community) should come away knowing his background, seeing his selected GitHub work,
reading his own articles, and seeing links he finds worth sharing. He reposts/shares
these on LinkedIn; the site is the permanent home.

## Goals

- Intro / about section built from his CV (content below).
- Links to LinkedIn (`https://www.linkedin.com/in/oitzik/`), GitHub (`https://github.com/itzikorfa`) and email.
- **Projects** section listing only GitHub repos he tags with the topic `portfolio`.
- **Blog**: his own articles, one Markdown file per post, each with its own shareable URL.
- **Reading** ("worth reading"): curated external links, each with title, URL, date, and his one-line take.
- Console/terminal look (chosen: "B + tap-to-run commands", see Look & feel).
- Comfortable on iPhone and Android first; also good on desktop.
- Publishing a post = add a Markdown file and push to GitHub, **or** write it in the in-site editor at `/admin` and click Publish.
- Hosted on AWS, using the domain already registered in his AWS account.

## Non-goals

- No automatic mirroring of LinkedIn posts (LinkedIn's API doesn't allow it for personal sites).
- No Hebrew / RTL / multi-language. **English only.**
- No database, comments, visitor accounts, visitor-submitted content, newsletter, or contact form. (A Git-based editor for the owner only is in scope; see "In-site editor".)
- No analytics in v1 (can add later).

## Anti-goals (a failure even if it "works")

- **Phone number or home address published anywhere** on the site or in the public repo.
- His personal Gmail address published anywhere on the site or in the repo.
- Showing all 15 repos (mostly small teaching samples/forks) — undersells him.
- A console gimmick that makes content hard to find or read — e.g. requiring typing, especially on phones.
- The CV `.doc` (contains phone number) committed to a public repo.

## Constraints

- Domain `program-il.com` is registered in Route 53 and has a public hosted zone in the **same** AWS account (verified 2026-11-25). The domain's name servers match the zone, and the zone is empty apart from NS/SOA, so there are no existing records to conflict with. Auto-renew is on, and the domain expires 2027-12-16.
- Low running cost (target: a few dollars/month at most).
- He is a developer comfortable with Git and Markdown.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Static site in a GitHub repo, built and hosted by **AWS Amplify Hosting**, auto-deploy on push, domain + HTTPS via Amplify's Route 53 integration | Simplest AWS setup, near-zero cost, posts are files in Git. Less low-level control than raw S3/CloudFront. |
| B | Same static site on S3 + CloudFront with a GitHub Actions deploy | Slightly cheaper, more control, but more pieces to configure and debug. |
| C | Hosted blog platform (Ghost/Hashnode) on the custom domain | Browser editor, but GitHub section hard to customize, Ghost ~$9+/mo, little control over look. |

He picked **A**.

Content-model options: (1) curated links only, (2) own blog only, (3) both. He picked **(3) both**.

In-site editor options: (A) Git-based CMS at `/admin` with GitHub login: free, no server, publishes by committing to the repo. (B) Custom AWS admin (Cognito + Lambda): full control, but several services to build and secure. (C) No editor, just a link to GitHub's web editor: zero effort, clumsy on phones. He picked **A**.

Look options shown as mockups: A retro CRT, B modern terminal, C interactive typed shell, plus mobile variants. He picked **"B + tap-to-run commands"** after asking which is most comfortable on smartphones.

## Decided by the owner

- Hosting: AWS Amplify (approach A).
- Content: own blog + curated "worth reading" list.
- Language: English only.
- GitHub username `itzikorfa`; LinkedIn `https://www.linkedin.com/in/oitzik/`.
- Intro content comes from his CV.
- No phone number on the site.
- Projects = only repos tagged `portfolio` on GitHub.
- Look: modern terminal + tap-to-run command buttons (details below).

## Content (from CV)

**Name/title:** Yizhak (Itzik) Orfanian — Senior Software Developer · Cloud Security & AI.

**About:** 10 years at Check Point Software Technologies building cloud security products
across AWS, Azure, GCP and VMware. Java, Python, Node.js. Recently integrating LLMs
(Copilot), LangFlow and vector databases into product features. Mentors junior developers.
Former Computer Science lecturer (2012–2020). M.A. Computer Science, Cybersecurity
specialization (Open University; thesis: threats to medical data and medical devices).
B.A. Computer Science, Sapir College (Dean's Honors 2010).

**Experience (short):**
- Senior Software Developer, Check Point — Apr 2016–present
- Computer Science Lecturer, various colleges — 2012–2020
- Software Developer, Angel Apps — 2012–2015
- System Architect, S.M.I Computers & Networks — 1994–2012

**Skills:** Java, Python, Node.js, C#, C · AWS, Azure, GCP, VMware, Docker, microservices ·
cloud & network security · LLM integration, LangFlow, vector DBs · SQL/NoSQL · CI/CD, Git.

**Certifications:** MCSE, Novell CNE.

**Contact shown:** LinkedIn, GitHub, email **`hi@program-il.com`** (owner decision), which forwards to his
personal Gmail. The Gmail address itself never appears on the site or in the repo. Location shown at most
as "Israel". No phone. **No CV download** (owner decision).

## Look & feel

Modern terminal aesthetic (dark, GitHub-dark-like palette, monospace font, syntax-colored
prompt `itzik@program-il:~$`). Sections are rendered as command output:
`whoami` → about, `ls projects/` → projects, `ls blog/` → articles, `cat reading.txt` → reading,
`contact` → links.

- **Command buttons** (`about`, `projects`, `blog`, `reading`, `contact`) sit at the top and act as
  the navigation. Tapping one scrolls to the section and plays a short "typing" animation of that
  command. **No typing is ever required.** The page scrolls normally and all content is visible
  without interaction (good for skimmers and search engines).
- **Mobile:** window chrome hidden, prompt shortened to `$`, list items as full-width tappable rows,
  LinkedIn/GitHub/Email as large buttons, comfortable tap targets, no horizontal scroll.
- **Desktop:** shown inside a terminal-window frame (traffic-light dots, title bar), same buttons.
- Article pages: readable long-form layout (comfortable line length, good contrast) styled to match,
  not raw terminal text.
- Respect `prefers-reduced-motion` (no typing animation).
- Text contrast meets WCAG AA.

Reference mockups: `.superpowers/brainstorm/57728-1795635810/content/console-mobile.html`
(option "B + tap-to-run commands") and `console-style.html` (option B).

## Content workflow

- **Blog post:** add `src/content/blog/<slug>.md` with front-matter (title, date, summary, optional tags), push → live in a few minutes at `program-il.com/blog/<slug>`.
- **Reading item:** add an entry to one data file (e.g. `src/content/reading.yaml`: title, url, date, note), push.
- **Project:** add topic `portfolio` to a public repo on GitHub (and ideally a description). Appears on next build.
- Repo seeded with: one placeholder/welcome post he can edit or delete, and an empty or near-empty reading list.

## In-site editor (`/admin`) (owner request; option A chosen)

So he can write and publish from a browser or phone without opening code.

- A Git-based CMS served as static files at `program-il.com/admin`. Claude's call: **Sveltia CMS**,
  falling back to **Decap CMS** if needed. No database, no server.
- **Owner only.** Login is with GitHub. Only an account with write access to the site repo can publish.
  Sveltia allows signing in with a GitHub personal access token (fine-grained, scoped to this one repo,
  contents read/write), so no OAuth server is needed. If an OAuth login button is wanted later (or Decap is
  used), it needs a small OAuth proxy, e.g. one AWS Lambda function.
- Collections it edits:
  - **Blog posts:** title, date, summary, tags, body (Markdown with preview), and a draft flag (drafts are not built).
  - **Worth reading:** title, URL, date, his note. Edits the same `reading.yaml` data file.
- Image uploads are committed to the repo (e.g. `public/images/blog/`).
- Publish = the CMS commits to `main`, then Amplify auto-builds (same path as a manual push).
- `/admin` is excluded from search and AI indexing (`noindex` + `robots.txt` disallow) and isn't linked anywhere on the public site.
- Must be usable on a phone.

## Projects data

Fetched from the GitHub public API at **build time** (repos of `itzikorfa` with topic `portfolio`;
show name, description, primary language, link, stars if > 0). A **daily scheduled rebuild**
(e.g. GitHub Actions cron calling an Amplify incoming webhook) picks up newly tagged repos without
a push. If the API fails during a build, the build should still succeed (show last known list or an
empty-state message), never break the site.

## Owner review before going live (approval condition)

The owner approved this design on the condition that he sees the site before it is public:
1. **Local preview:** run the real site on his Mac and show it in the browser at desktop and phone widths. Iterate on his feedback.
2. **Staging:** deploy to the default Amplify URL (`main.<id>.amplifyapp.com`) so he can check it on his own phone. That URL is `noindex` / disallowed in robots.txt.
3. **`program-il.com` is connected only after his explicit OK** on staging.
4. Per article: the `/admin` editor's preview, plus draft posts aren't built.

## Hosting & domain

- New GitHub repo for the site under `itzikorfa`.
- AWS Amplify Hosting app connected to that repo's main branch; build on push.
- Custom domain `program-il.com` + `www` (redirect www → apex) via Amplify domain management with
  the Route 53 hosted zone; Amplify-managed HTTPS certificate.
- Repo `.gitignore` excludes the CV `.doc` and `.superpowers/`.

## Email forwarding (hi@program-il.com → personal Gmail)

Receive-only forwarding; replies are sent from Gmail. Claude's call: **ImprovMX free tier**: add its
MX + SPF records to the Route 53 zone, then set the alias. It takes a few minutes, costs nothing, and has
no code to maintain. All-AWS alternative if he prefers: SES email receiving → S3 → Lambda forwarder
(roughly free, more pieces, and SES inbound only works in some regions). Show the address on the site as a
normal `mailto:` link. It's an alias that can be switched off if spam gets bad.

## Rebuild on demand (owner request)

Besides auto-build on push and the daily scheduled rebuild, the owner can trigger a rebuild anytime:
- GitHub Actions workflow with `workflow_dispatch` ("Run workflow" button, also from the GitHub mobile app) that POSTs to the Amplify incoming webhook.
- A small `rebuild.sh` script in the repo doing the same (reads webhook URL from an env var / local untracked file, never committed).
- Amplify console "Redeploy" also works.

## AI-friendly (owner request)

Goal: AI assistants and AI search (ChatGPT, Claude, Perplexity, Google AI) can find and accurately describe him.
- `/llms.txt` — concise Markdown summary (who he is, skills, links to posts and projects), per the llms.txt convention. Optionally `/llms-full.txt` with full post text.
- Markdown twin of each post at `/blog/<slug>.md`.
- JSON-LD structured data: `Person` (name, jobTitle, worksFor Check Point, sameAs LinkedIn/GitHub) on the home page; `BlogPosting` (author, dates) on posts.
- All content present in static HTML without JavaScript (console animation is progressive enhancement only).
- `robots.txt`, `sitemap.xml`, RSS feed.

**Crawler policy (owner decision): block AI *training* crawlers for now; allow normal search engines and AI search/answer bots.** He may enable training crawlers after reviewing the live site, so the policy must be a single obvious switch (one config value or one block in `robots.txt`).
- Block: `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, `Applebot-Extended`, `Meta-ExternalAgent`, `Bytespider` (builder keeps the list current).
- Allow: `Googlebot`, `Bingbot`, `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, and all others.

## Calls made during design review (Claude's calls, owner may override)

- **Static output only** (no SSR) on Amplify.
- **Projects fetch:** build-time GitHub API call using an optional `GITHUB_TOKEN` Amplify env var
  (avoids shared-IP rate limits). A committed snapshot `src/data/projects.json` is the fallback
  when the API fails; a successful fetch at build time is used for that build. Daily rebuild via a
  GitHub Actions cron that POSTs to an Amplify incoming webhook stored as a GitHub Actions secret.
- **Site repo is public** under `itzikorfa` (shows his work). Publishing = direct push to `main`.
  `.gitignore` excludes `*.doc`, `*.docx`, `.superpowers/`, `.impeccable/` before the first commit,
  so the CV never enters git history.
- **Copy:** the "Content (from CV)" section above is the final v1 copy, employer and college names included.

## Builder's calls (left to the implementer)

- Static site generator (Astro is the suggested default — Markdown content collections, zero JS by default) and exact folder layout.
- Exact color palette and font (within "modern dark terminal"; self-host or use a Google Font).
- How the typing animation is implemented.
- Page `<title>`/meta/Open Graph tags so posts look good when shared on LinkedIn.
- 404 page in console style.
