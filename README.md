# program-il.com

Personal site of Yizhak (Itzik) Orfanian at **itzik.program-il.com** (program-il.com redirects here for now). It's a static [Astro](https://astro.build) site with a console look, hosted on AWS Amplify.

## Write a post

**From the browser (or phone):** go to `https://itzik.program-il.com/admin/` and sign in with a GitHub
fine-grained token that has *Contents: read & write* on this repo only. New posts start as **drafts**.
Switch "Draft" off and publish, and the site rebuilds in a couple of minutes.

**From your editor:** add `src/content/blog/<slug>.md`:

```md
---
title: "My post"
date: 2026-12-01
summary: "One line shown in lists and when shared"
tags: [aws, security]
draft: false
---

Post body in Markdown…
```

Push to `main` and Amplify builds and publishes it. Posts with `draft: true` or a future date are never published.

## Add a "worth reading" link

Use `/admin` → *Worth reading*, or add an entry to `src/content/reading.yaml`:

```yaml
- title: "Article title"
  url: https://example.com/article
  date: 2026-12-01
  note: "Why it's worth reading"
```

## Show a GitHub project

On GitHub, open the repo, click the ⚙️ next to **About**, add the topic **`portfolio`**, and write a
one-line description. It appears after the next build. Forks are never shown.

## Rebuild now

- GitHub → **Actions** → *Rebuild site* → **Run workflow** (also works in the GitHub mobile app), or
- `./rebuild.sh` (needs the Amplify webhook URL in `AMPLIFY_WEBHOOK_URL` or in `.rebuild-url`, which is git-ignored), or
- the **Redeploy** button in the AWS Amplify console.

The site also rebuilds automatically every day at 03:00 UTC.

## Portrait

The ASCII portrait (`src/data/portrait.txt`) and the share card (`public/og.png`) are generated from
`assets/portrait-drawing.jpg`. Replace that file and run `npm run portrait`.

## AI crawlers

`/llms.txt`, `/llms-full.txt` and a Markdown copy of every post (`/blog/<slug>.md`) help AI tools describe the site accurately.
AI **training** crawlers are blocked in `robots.txt`. To allow them, set `ALLOW_AI_TRAINING = true` in
`src/config/site.ts` and push.

## Develop

```sh
npm install
npm run dev          # http://localhost:4321
npm test             # unit tests
npm run test:e2e     # browser tests (desktop, iPhone, Android, 360px)
```

Build-time env vars (set in Amplify): `GITHUB_TOKEN` (optional, avoids GitHub API rate limits),
`SITE_INDEXABLE` (`true` only on the live domain; otherwise every page is `noindex`).

## Copyright

© Yizhak (Itzik) Orfanian. All rights reserved. The code and content in this repository may not be
reused, copied or redistributed without permission.

## Favorites (visitor suggestions)

Visitors suggest a link at `/favorites/suggest/`. They get an email with a confirmation link; confirming opens a
pull request that adds one file to `src/content/favorites/`. **Edit the file in the PR if you like, then merge to
publish** (or close to reject). The list shows newest first.

Backend (AWS, us-east-1): Lambda `favorites-suggest` + function URL, a rate-limit table, SES email.

- One-time email setup: `infra/setup-ses.sh`, then request SES production access in the AWS console.
- GitHub token (fine-grained, this repo only, **Contents: read & write** and **Pull requests: read & write**):
  copy it, then `pbpaste | infra/set-github-token.sh`. Repeat when it expires.
- Deploy or update the backend: `infra/deploy-favorites.sh`. It prints the API URL.
- Turn the form on: set Amplify env var `PUBLIC_FAVORITES_API` to that URL and rebuild. Unset = form shows "closed".
