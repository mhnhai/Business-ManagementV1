import EnvVars from '@src/common/constants/env';

const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

/** Vercel production + preview deployments (branch URLs). */
const VERCEL_ORIGIN_PATTERN = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/;

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, '');
}

export function getCorsOrigins(): string[] {
  const origins = new Set<string>(LOCAL_ORIGINS);

  if (EnvVars.FrontendUrl) {
    origins.add(normalizeOrigin(EnvVars.FrontendUrl));
  }

  const extra = process.env.CORS_ORIGINS?.split(',') ?? [];
  for (const origin of extra) {
    if (origin.trim()) {
      origins.add(normalizeOrigin(origin));
    }
  }

  return [...origins];
}

export function isAllowedCorsOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);
  if (getCorsOrigins().includes(normalized)) {
    return true;
  }
  return VERCEL_ORIGIN_PATTERN.test(normalized);
}
