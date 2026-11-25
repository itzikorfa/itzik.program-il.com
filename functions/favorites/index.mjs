// Lambda entry point: wires the real AWS services into the tested handler.
// AWS SDK v3 ships with the nodejs22.x runtime, so this function has no npm dependencies.
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { createHandler } from './handler.mjs';
import { createRateLimiter } from './ratelimit.mjs';

const { TABLE_NAME, FROM_ADDRESS, REPO, ALLOWED_ORIGIN, PARAM_PREFIX = '/favorites' } = process.env;
const ssm = new SSMClient({});
const ddb = new DynamoDBClient({});
const ses = new SESv2Client({});

let ready; // cached per Lambda container
async function load() {
  const names = [`${PARAM_PREFIX}/token-secret`, `${PARAM_PREFIX}/github-token`];
  const out = await ssm.send(new GetParametersCommand({ Names: names, WithDecryption: true }));
  const get = (n) => {
    const p = out.Parameters?.find((x) => x.Name === n);
    if (!p?.Value) throw new Error(`Missing SSM parameter ${n}`);
    return p.Value;
  };
  const secret = get(names[0]);
  const githubToken = get(names[1]);

  const incr = async (key, max, expires) => {
    try {
      await ddb.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { pk: { S: key } },
        UpdateExpression: 'ADD n :one SET expires = if_not_exists(expires, :exp)',
        ConditionExpression: 'attribute_not_exists(n) OR n < :max',
        ExpressionAttributeValues: { ':one': { N: '1' }, ':max': { N: String(max) }, ':exp': { N: String(expires) } },
      }));
      return true;
    } catch (e) {
      if (e?.name === 'ConditionalCheckFailedException') return false;
      throw e;
    }
  };

  return createHandler({
    secret,
    allowedOrigin: ALLOWED_ORIGIN,
    repo: REPO,
    getGithubToken: async () => githubToken,
    fetchImpl: fetch,
    limiter: createRateLimiter({ incr, secret }),
    sendEmail: ({ to, subject, text }) => ses.send(new SendEmailCommand({
      FromEmailAddress: FROM_ADDRESS,
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' } } } },
    })),
    now: () => Math.floor(Date.now() / 1000),
    log: (x) => console.log(JSON.stringify(x)),
  });
}

export const handler = async (event) => {
  ready ??= load().catch((e) => { ready = undefined; throw e; });
  return (await ready)(event);
};
