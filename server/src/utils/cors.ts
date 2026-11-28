/**
 * CORS Configuration and Origin Validator
 */

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://interclub-dashboard.vercel.app',
];

const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const allowedOrigins = envOrigins.includes('*')
  ? ['*']
  : Array.from(new Set([...defaultOrigins, ...envOrigins]));

export const isAllowedOrigin = (origin: string | undefined): boolean => {
  // 1. Allow requests with no origin (mobile apps, curl, server-to-server, direct browser bar)
  if (!origin) {
    return true;
  }

  // 2. Allow wildcard if configured
  if (allowedOrigins.includes('*')) {
    return true;
  }

  const normalizedOrigin = origin.trim().replace(/\/+$/, '');

  // 3. Exact match in allowed origins list
  if (allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  // 4. Automatically allow any Vercel deployment of interclub-dashboard (preview branches, PR builds)
  if (/^https:\/\/interclub-dashboard[a-zA-Z0-9_-]*\.vercel\.app$/.test(normalizedOrigin)) {
    return true;
  }

  return false;
};
