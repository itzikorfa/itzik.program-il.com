# Favorites Implementation Plan

> Executed inline (native), test-first.

**Goal:** visitor-suggested favorites list with email verification and GitHub-PR approval.
**Spec:** `docs/superpowers/specs/2026-11-26-favorites-design.md`
**Tech:** Astro 7 (site), Node 22 Lambda with no npm deps (`functions/favorites/*.mjs`), CloudFormation, Vitest, Playwright.

## Global Constraints
- No visitor email in: token, PR, repo, logs, page output.
- CORS / allowed origin exactly `https://itzik.program-il.com`.
- Token TTL 24 h. Rate limits: IP 5/hour, email 3/day, site 50/day.
- Site must build and work with `PUBLIC_FAVORITES_API` unset (form disabled).

## Review Focus
1. Token tampering (edited payload, wrong secret, expired, garbage) → rejected, no PR.
2. Same confirm link clicked twice / by an email scanner → one PR only; GET never confirms.
3. Hostile input (javascript: URL, http, credentials in URL, 10 KB title, control chars) → rejected/cleaned.
4. GitHub API down or token expired → visitor sees a retry message, nothing half-created is left visible.
5. Honeypot filled → looks like success, sends nothing.

## Tasks
1. **Core logic** (`functions/favorites/core.mjs`): `validateSuggestion`, `kindOf`, `signToken`, `verifyToken`,
   `favoriteFile`, `confirmEmail`. Tests: `tests/unit/favorites-core.test.ts`.
2. **Services + handler** (`ratelimit.mjs`, `github.mjs`, `handler.mjs`, `index.mjs` wiring real AWS clients):
   injected deps; tests: `tests/unit/favorites-handler.test.ts`.
3. **Site list**: `favorites` collection, `Favorites.astro`, home section + command, llms.txt.
   Fixtures `tests/fixtures/favorites/*.yaml`; e2e `tests/e2e/favorites.spec.ts`.
4. **Site form + confirm pages**: `/favorites/suggest/`, `/favorites/confirm/`, `src/scripts/favorites.ts`;
   e2e with the API mocked by Playwright routing.
5. **Infra**: `infra/favorites.yaml`, `infra/deploy-favorites.sh`; unit test parses the template and checks
   CORS origin, TTL, log retention, IAM scope.
6. **Deploy (owner approval required)**: SES identity + DKIM + DMARC, SSM secrets, stack deploy,
   `PUBLIC_FAVORITES_API` on Amplify, SES production-access request, end-to-end test.
