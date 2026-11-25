#!/usr/bin/env bash
# Deploys the favorites backend: secrets (created once), CloudFormation stack, function code.
# Needs: AWS CLI logged in, the GitHub token stored first (infra/set-github-token.sh).
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
REGION=us-east-1
STACK=favorites
PREFIX=/favorites
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

if ! aws ssm get-parameter --region $REGION --name "$PREFIX/github-token" --query Parameter.Name --output text >/dev/null 2>&1; then
  echo "Store the GitHub token first: copy it, then run: pbpaste | infra/set-github-token.sh" >&2
  exit 1
fi

if ! aws ssm get-parameter --region $REGION --name "$PREFIX/token-secret" --query Parameter.Name --output text >/dev/null 2>&1; then
  node -e 'const v=require("crypto").randomBytes(48).toString("base64url");process.stdout.write(JSON.stringify({Name:process.argv[1],Type:"SecureString",Value:v}))' "$PREFIX/token-secret" > "$TMP/secret.json"
  aws ssm put-parameter --region $REGION --cli-input-json "file://$TMP/secret.json" --output text >/dev/null
  echo "Created $PREFIX/token-secret"
fi

aws cloudformation deploy --region $REGION --stack-name $STACK --template-file infra/favorites.yaml \
  --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset

zip -j -q "$TMP/fn.zip" functions/favorites/*.mjs
aws lambda update-function-code --region $REGION --function-name favorites-suggest \
  --zip-file "fileb://$TMP/fn.zip" --output text --query LastUpdateStatus >/dev/null
aws lambda wait function-updated-v2 --region $REGION --function-name favorites-suggest

URL=$(aws cloudformation describe-stacks --region $REGION --stack-name $STACK \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" --output text)
echo "Favorites API: $URL"
