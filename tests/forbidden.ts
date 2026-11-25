import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const privateFile = fileURLToPath(new URL('../.private-patterns', import.meta.url));

/** Patterns that must never appear in tracked files or built pages. */
export const FORBIDDEN: RegExp[] = [
  /@gmail\.com/i,
  /\+972[-\s]?\d/,
  ...(existsSync(privateFile)
    ? readFileSync(privateFile, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => new RegExp(escape(l), 'i'))
    : []),
];

export const hasPrivatePatternsFile = existsSync(privateFile);
