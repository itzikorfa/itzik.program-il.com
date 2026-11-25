import type { APIRoute } from 'astro';
import { buildRobots, SITE_INDEXABLE, ALLOW_AI_TRAINING } from '../config/site';
export const GET: APIRoute = () =>
  new Response(buildRobots({ indexable: SITE_INDEXABLE, allowTraining: ALLOW_AI_TRAINING }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
