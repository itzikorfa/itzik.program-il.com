#!/usr/bin/env bash
# Stores the favorites GitHub token in SSM without it touching the command line or shell history.
# Usage: copy the token, then:  pbpaste | infra/set-github-token.sh
set -euo pipefail
umask 077
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
IFS= read -r TOKEN || true
[[ "$TOKEN" =~ ^github_pat_[A-Za-z0-9_]{20,}$ ]] || { echo "That doesn't look like a fine-grained token (github_pat_...)." >&2; exit 1; }
printf '%s' "$TOKEN" | node -e 'let v="";process.stdin.on("data",d=>v+=d).on("end",()=>process.stdout.write(JSON.stringify({Name:"/favorites/github-token",Type:"SecureString",Value:v,Overwrite:true})))' > "$TMP/p.json"
aws ssm put-parameter --region us-east-1 --cli-input-json "file://$TMP/p.json" --output text >/dev/null
echo "Stored /favorites/github-token"
