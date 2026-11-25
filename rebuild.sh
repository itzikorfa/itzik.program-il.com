#!/bin/sh
# Rebuild program-il.com now (e.g. after tagging a new GitHub repo with `portfolio`).
# The Amplify webhook URL is a secret: set AMPLIFY_WEBHOOK_URL, or put it on the first line of
# .rebuild-url (git-ignored). Never commit it.
set -eu
cd "$(dirname "$0")"
URL="${AMPLIFY_WEBHOOK_URL:-}"
if [ -z "$URL" ] && [ -f .rebuild-url ]; then
  URL="$(head -n 1 .rebuild-url | tr -d '[:space:]')"
fi
if [ -z "$URL" ]; then
  echo "Set AMPLIFY_WEBHOOK_URL or create .rebuild-url" >&2
  exit 1
fi
curl -fsS -X POST -H 'Content-Type: application/json' -d '{}' "$URL"
echo
echo "Rebuild started. The site updates in a few minutes."
