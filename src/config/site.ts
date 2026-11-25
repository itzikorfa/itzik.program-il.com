export const SITE_URL = 'https://program-il.com';
export const SITE_NAME = 'program-il.com';

/** false on staging (Amplify default URL): robots.txt blocks everything and pages are noindex. */
export const SITE_INDEXABLE = import.meta.env.SITE_INDEXABLE === 'true';

// Owner switch: set to true to allow AI training crawlers, then push.
export const ALLOW_AI_TRAINING = false;

/** Crawlers that collect data to train AI models. Blocked while ALLOW_AI_TRAINING is false. */
export const AI_TRAINING_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'CCBot',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'Bytespider',
];

/** Search engines and AI search/answer bots. Always allowed (listed for documentation). */
export const ALLOWED_BOTS = [
  'Googlebot',
  'Bingbot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
];

/**
 * robots.txt contents.
 * Staging (not indexable): block everything. Production: allow everyone except /admin/,
 * and block AI training crawlers unless allowTraining is true.
 */
export function buildRobots(opts: { indexable: boolean; allowTraining: boolean }): string {
  if (!opts.indexable) return 'User-agent: *\nDisallow: /\n';
  const groups: string[] = [];
  if (!opts.allowTraining) {
    groups.push(
      '# AI training crawlers: blocked for now (switch: ALLOW_AI_TRAINING in src/config/site.ts)\n' +
        AI_TRAINING_BOTS.map((b) => `User-agent: ${b}`).join('\n') +
        '\nDisallow: /',
    );
  }
  groups.push(
    '# Everyone else, incl. search engines and AI search/answer bots:\n# ' +
      ALLOWED_BOTS.join(', ') +
      '\nUser-agent: *\nAllow: /\nDisallow: /admin/',
  );
  return groups.join('\n\n') + `\n\nSitemap: ${SITE_URL}/sitemap-index.xml\n`;
}
