import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

describe('rebuild workflow', () => {
  it('is valid YAML with daily + manual triggers calling the webhook secret', () => {
    const wf = parse(readFileSync('.github/workflows/rebuild.yml', 'utf8'));
    expect(wf.on.schedule[0].cron).toBe('0 3 * * *');
    expect(wf.on).toHaveProperty('workflow_dispatch');
    expect(wf.permissions).toEqual({});
    const step = wf.jobs.rebuild.steps[0];
    expect(step.env.AMPLIFY_WEBHOOK_URL).toBe('${{ secrets.AMPLIFY_WEBHOOK_URL }}');
    expect(step.run).toContain('"$AMPLIFY_WEBHOOK_URL"');
  });
});
