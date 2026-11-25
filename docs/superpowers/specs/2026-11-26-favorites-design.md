# Favorites (visitor-suggested links): Design

Status: approved 2026-11-26 ("lets start developing"), using the suggested answers; open questions marked below.
Builds on: `2026-11-25-program-il-site-design.md` (phase 1, live at https://itzik.program-il.com).

## Intent
A **favorites** list of websites and GitHub repos on the site, newest first (LIFO). Visitors can suggest a link
through a small form. A suggestion only reaches the owner after the visitor proves their email address is real.
The owner approves by merging a GitHub pull request, and can edit it first.

Open: the owner has not yet said what the list is *for* (developer resource list vs. visitor shout-outs).
Nothing below depends on it. It only affects wording on the page and how strict review is.

## Goals
- Visitors suggest a link with: URL (required, https), title (required), why (optional, one line), name (optional), email (required).
- Email is verified by a confirmation link before anything reaches the owner.
- Each confirmed suggestion becomes a pull request on `itzikorfa/itzik.program-il.com` adding one favorite.
- The owner edits/merges/closes in GitHub (web or phone app). A merge rebuilds the site (existing auto-build).
- List shows newest first, with a `site` / `repo` tag, the "why" line, and "suggested by <name>" when a name was given.

## Non-goals
- No notifying visitors when their link is approved (would require keeping their email).
- No accounts, comments, voting, or editing after submission.
- No owner-side admin UI beyond GitHub (and `/admin` for direct edits).

## Anti-goals (failure even if it works)
- Storing or publishing visitor email addresses.
- The site becoming a tool to spam other people's inboxes (email bombing through the form).
- A suggestion appearing on the site without the owner's merge.
- Phase 1 pages breaking or slowing when the backend is down or not yet deployed.

## Approaches considered
1. **Stateless signed link + GitHub PR (chosen).** Lambda emails a confirmation link carrying the suggestion,
   HMAC-signed. Confirming opens a PR. No database of suggestions or emails. A tiny counter table (salted hashes,
   auto-expiring) only for rate limits.
2. **Database of pending suggestions (DynamoDB) + admin page.** More control (e.g. notify on approval) but stores
   emails and needs an approval UI. Rejected: privacy burden, more to build.
3. **Third-party form service (Formspree/Google Forms) + manual copy.** No email verification of the kind wanted,
   owner copies links by hand, data goes to a third party. Rejected.

## Design

### Site (static, Astro)
- Content: one YAML file per favorite in `src/content/favorites/` named `YYYY-MM-DD-<id>.yaml`
  (one file each, so two open PRs never conflict). Fields: `title`, `url` (http(s) only), `date`, `kind`
  (`site` | `repo`), `why` (optional), `suggestedBy` (optional).
- Order: `date` descending, then file id descending (LIFO).
- Home: new section `favorites` (`ls favorites/`), new command in the command bar, and a `./suggest-link` link.
- `/favorites/suggest/`: the form. Hidden honeypot field `website`. Privacy line:
  "Your email is only used to send one confirmation link. It is not stored or published."
- `/favorites/confirm/#<token>`: shows the suggestion read from the token and a **Confirm** button that POSTs.
  The token is in the URL *fragment* (never sent to servers or logs), and confirming needs a click, because
  email security scanners open links automatically and would otherwise confirm on the visitor's behalf.
- API base URL comes from build env `PUBLIC_FAVORITES_API`. If unset, the form shows
  "Suggestions are closed for now" and stays disabled. The site ships before the backend exists.
- `llms.txt` lists favorites under Optional.

### Backend (AWS, us-east-1)
- One Lambda (Node 22, arm64, no npm dependencies; AWS SDK v3 from the runtime) behind a **Lambda Function URL**
  (free; CORS allows only `https://itzik.program-il.com`). Routes:
  - `POST /suggest`: validate, honeypot (filled → reply success, do nothing), rate-limit, sign token
    (expires 24 h), send confirmation email via SES. Reply 202.
  - `POST /confirm` `{token}`: verify signature + expiry, open the PR. Same token twice → "already confirmed"
    (branch name derives from the token, so no state needed).
- Token: `base64url(JSON payload).base64url(HMAC-SHA256)`. Payload: url, title, why, name, kind, iat, exp.
  **No email in the token.**
- Rate limits (DynamoDB on-demand, items auto-expire via TTL): per IP 5/hour, per email 3/day, whole site
  50 emails/day. Keys are HMAC hashes (secret-keyed), never raw IPs or emails.
- PR: branch `suggest/<12 hex>`, one new file in `src/content/favorites/`, title `Favorite: <title>`,
  body with the fields and "Email verified". No email address anywhere in the PR.
- Secrets in SSM Parameter Store (SecureString): `/favorites/token-secret` (random, generated at deploy),
  `/favorites/github-token` (owner-created fine-grained PAT, this repo only: Contents RW + Pull requests RW).
- Email: SES domain identity `program-il.com` with Easy DKIM (Route 53 records), sender `noreply@program-il.com`,
  plus DMARC `p=none`. Needs SES production access (one-time AWS request, owner approves).
- Logs: outcome only (`suggest: sent`, `rate-limited`, …), never the email. Log retention 14 days.
- Infra as code: `infra/favorites.yaml` (CloudFormation) + `infra/deploy-favorites.sh`.
- Cost: about $0/month at personal-site scale.

### Validation rules
- url: absolute https (http rejected), ≤ 300 chars, no credentials (`user:pass@`).
- title: 1–100 chars after trim. why ≤ 200. name ≤ 50. email: `x@y.z` shape, ≤ 254.
- kind: `repo` when the URL is `https://github.com/<owner>/<repo>` (optionally trailing path), else `site`.
- Control characters stripped; text rendered by Astro (escaped). The build schema re-checks every merged file.

## Risks accepted
- The GitHub token can also push to `main` directly (fine-grained tokens can't be limited to branches; requiring
  PRs on `main` would break `/admin`). Mitigation: token only in SSM, only this repo, expiry ≤ 1 year.
- Suggested links are publicly visible in PRs before review (public repo), without the visitor's email.

## Left to the builder
File/module layout inside `functions/favorites/`, exact copy on the pages, styling within the existing terminal look.
