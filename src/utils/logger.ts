/**
 * Minimal structured logger. Redacts likely-sensitive values (emails, tokens, card numbers)
 * so they never end up in logs, traces, or RCA artifacts.
 */
const REDACT_PATTERNS: Array<[RegExp, string]> = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<email:redacted>'],
  [/\b(?:\d[ -]*?){13,19}\b/g, '<card:redacted>'], // card-like digit runs
  [/("?(?:password|token|authorization|api[_-]?key)"?\s*[:=]\s*)"[^"]*"/gi, '$1"<redacted>"'],
];

export function redact(input: string): string {
  return REDACT_PATTERNS.reduce((acc, [re, rep]) => acc.replace(re, rep), input);
}

export const log = {
  info: (msg: string, meta?: unknown) => console.log(`[INFO] ${redact(msg)}`, meta ? redact(JSON.stringify(meta)) : ''),
  warn: (msg: string, meta?: unknown) =>
    console.warn(`[WARN] ${redact(msg)}`, meta ? redact(JSON.stringify(meta)) : ''),
  error: (msg: string, meta?: unknown) =>
    console.error(`[ERROR] ${redact(msg)}`, meta ? redact(JSON.stringify(meta)) : ''),
};
