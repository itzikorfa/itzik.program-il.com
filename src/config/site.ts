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
