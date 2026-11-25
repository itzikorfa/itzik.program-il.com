// Fixed-window rate limits. Keys are keyed hashes, so raw IPs and emails are never stored.
import { createHmac } from 'node:crypto';

export const LIMITS = {
  ip: { max: 5, window: 3600 },      // per IP, per hour
  email: { max: 3, window: 86400 },  // per email address, per day
  site: { max: 50, window: 86400 },  // whole site, per day
};

/**
 * incr(key, max, ttlSeconds) -> Promise<boolean>: atomically count one more use of `key`,
 * returning false (and not counting) when it is already at `max`.
 */
export function createRateLimiter({ incr, secret, now = () => Math.floor(Date.now() / 1000) }) {
  const h = (v) => createHmac('sha256', secret).update(`rl:${v}`).digest('hex').slice(0, 24);
  return {
    async check({ ip, email }) {
      const t = now();
      const checks = [
        ['ip', `ip#${h(ip)}`],
        ['email', `email#${h(email)}`],
        ['site', 'site'],
      ];
      for (const [kind, base] of checks) {
        const { max, window } = LIMITS[kind];
        const bucket = Math.floor(t / window);
        if (!(await incr(`${base}#${bucket}`, max, (bucket + 1) * window + 60))) return { ok: false, limit: kind };
      }
      return { ok: true };
    },
  };
}
