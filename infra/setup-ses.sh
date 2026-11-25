#!/usr/bin/env bash
# One-time: lets AWS SES send mail as @program-il.com (Easy DKIM + DMARC records in Route 53).
set -euo pipefail
REGION=us-east-1
DOMAIN=program-il.com
ZONE=Z1033648316G4NJR1IOQU

aws sesv2 get-email-identity --region $REGION --email-identity $DOMAIN >/dev/null 2>&1 \
  || aws sesv2 create-email-identity --region $REGION --email-identity $DOMAIN >/dev/null

TOKENS=$(aws sesv2 get-email-identity --region $REGION --email-identity $DOMAIN --query 'DkimAttributes.Tokens' --output text)
CHANGES=""
for t in $TOKENS; do
  CHANGES+="{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$t._domainkey.$DOMAIN.\",\"Type\":\"CNAME\",\"TTL\":3600,\"ResourceRecords\":[{\"Value\":\"$t.dkim.amazonses.com.\"}]}},"
done
CHANGES+="{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"_dmarc.$DOMAIN.\",\"Type\":\"TXT\",\"TTL\":3600,\"ResourceRecords\":[{\"Value\":\"\\\"v=DMARC1; p=none;\\\"\"}]}}"
aws route53 change-resource-record-sets --hosted-zone-id $ZONE \
  --change-batch "{\"Comment\":\"SES DKIM + DMARC\",\"Changes\":[$CHANGES]}" --query ChangeInfo.Status --output text
echo "DKIM records added. Verification usually takes a few minutes:"
echo "  aws sesv2 get-email-identity --region $REGION --email-identity $DOMAIN --query DkimAttributes.Status"
