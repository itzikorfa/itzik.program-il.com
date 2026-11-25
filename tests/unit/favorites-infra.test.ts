import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const tpl = parse(readFileSync('infra/favorites.yaml', 'utf8'));
const R = tpl.Resources;
const ofType = (t: string) => Object.values(R).filter((r: any) => r.Type === t) as any[];

describe('favorites CloudFormation template', () => {
  it('exposes the function only via a public URL limited by CORS to the site', () => {
    const [url] = ofType('AWS::Lambda::Url');
    expect(url.Properties.AuthType).toBe('NONE');
    expect(url.Properties.Cors.AllowMethods).toEqual(['POST']);
    expect(url.Properties.Cors.AllowHeaders).toEqual(['content-type']);
    expect(tpl.Parameters.AllowedOrigin.Default).toBe('https://itzik.program-il.com');
    expect(url.Properties.Cors.AllowOrigins).toEqual([{ Ref: 'AllowedOrigin' }]);
  });

  it('runs Node 22 on arm64 with a short timeout and the config the code reads', () => {
    const [fn] = ofType('AWS::Lambda::Function');
    expect(fn.Properties).toMatchObject({ Runtime: 'nodejs22.x', Architectures: ['arm64'], Handler: 'index.handler', Timeout: 10 });
    expect(Object.keys(fn.Properties.Environment.Variables).sort()).toEqual(['ALLOWED_ORIGIN', 'FROM_ADDRESS', 'PARAM_PREFIX', 'REPO', 'TABLE_NAME']);
  });

  it('rate-limit table expires items and bills per request', () => {
    const [t] = ofType('AWS::DynamoDB::Table');
    expect(t.Properties.BillingMode).toBe('PAY_PER_REQUEST');
    expect(t.Properties.TimeToLiveSpecification).toEqual({ AttributeName: 'expires', Enabled: true });
  });

  it('keeps logs for 14 days only', () => {
    const [lg] = ofType('AWS::Logs::LogGroup');
    expect(lg.Properties.RetentionInDays).toBe(14);
  });

  it('grants least privilege (no wildcard resources, scoped SSM path, fixed sender)', () => {
    const [role] = ofType('AWS::IAM::Role');
    const statements = role.Properties.Policies.flatMap((p: any) => p.PolicyDocument.Statement);
    for (const s of statements) {
      expect(s.Effect).toBe('Allow');
      expect(s.Resource).not.toBe('*');
      expect(JSON.stringify(s.Action)).not.toContain('*');
    }
    const ssm = statements.find((s: any) => JSON.stringify(s.Action).includes('ssm:'));
    expect(ssm.Action).toEqual(['ssm:GetParameters']);
    expect(JSON.stringify(ssm.Resource)).toContain('parameter${ParamPrefix}/*');
    const ses = statements.find((s: any) => JSON.stringify(s.Action).includes('ses:'));
    expect(ses.Action).toEqual(['ses:SendEmail']);
    expect(ses.Condition).toEqual({ StringEquals: { 'ses:FromAddress': { Ref: 'FromAddress' } } });
    const ddb = statements.find((s: any) => JSON.stringify(s.Action).includes('dynamodb:'));
    expect(ddb.Action).toEqual(['dynamodb:UpdateItem']);
  });

  it('allows public invoke only through the function URL', () => {
    const perms = ofType('AWS::Lambda::Permission');
    expect(perms.map((p) => p.Properties.Action).sort()).toEqual(['lambda:InvokeFunction', 'lambda:InvokeFunctionUrl']);
    for (const p of perms) expect(p.Properties.Principal).toBe('*');
    expect(perms.find((p) => p.Properties.Action === 'lambda:InvokeFunctionUrl').Properties.FunctionUrlAuthType).toBe('NONE');
    expect(perms.find((p) => p.Properties.Action === 'lambda:InvokeFunction').Properties.InvokedViaFunctionUrl).toBe(true);
  });

  it('outputs the function URL', () => {
    expect(tpl.Outputs.FunctionUrl.Value).toEqual({ 'Fn::GetAtt': ['FunctionUrl', 'FunctionUrl'] });
  });
});

describe('deploy scripts', () => {
  const deploy = readFileSync('infra/deploy-favorites.sh', 'utf8');
  const token = readFileSync('infra/set-github-token.sh', 'utf8');

  it('never passes secrets on the command line', () => {
    expect(deploy).toMatch(/umask 077/);
    expect(deploy).toMatch(/--cli-input-json "?file:\/\//);
    expect(deploy).not.toMatch(/--value\s/);
    expect(token).toMatch(/--cli-input-json "?file:\/\//);
    expect(token).not.toMatch(/--value\s/);
  });

  it('ships only the function source files', () => {
    expect(deploy).toMatch(/zip -j .* functions\/favorites\/\*\.mjs/);
  });
});
