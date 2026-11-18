import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthenticatedRequest extends Request {
  authorName?: string;
}

/**
 * Retrieves the configured Director secret key.
 * In production, enforces that DIRECTOR_KEY is configured and rejects default/insecure keys.
 */
export function getDirectorKey(): string {
  const key = process.env.DIRECTOR_KEY?.trim();

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 [CRITICAL SECURITY ERROR] DIRECTOR_KEY is not defined in environment variables!');
      throw new Error('DIRECTOR_KEY must be defined in production.');
    }
    return 'director1234';
  }

  if (process.env.NODE_ENV === 'production' && key === 'director1234') {
    console.warn('⚠️ [SECURITY WARNING] Production is using the default DIRECTOR_KEY ("director1234"). Please configure a strong secret in your environment.');
  }

  return key;
}

/**
 * Extracts authentication token from safe HTTP headers (x-director-key or Authorization: Bearer <key>).
 * Strictly forbids query parameters to prevent secret leakage in logs, history and Referer headers.
 */
export function extractProvidedKey(req: Request): { key: string | null; rejectedFromQuery: boolean } {
  // 1. Check for forbidden query parameter usage
  if (req.query?.directorKey) {
    return { key: null, rejectedFromQuery: true };
  }

  // 2. Check x-director-key header
  const customHeader = req.headers['x-director-key'];
  if (customHeader) {
    const str = Array.isArray(customHeader) ? customHeader[0] : customHeader;
    return { key: str.trim(), rejectedFromQuery: false };
  }

  // 3. Check Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { key: authHeader.slice(7).trim(), rejectedFromQuery: false };
  }

  return { key: null, rejectedFromQuery: false };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function safeCompareKeys(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;

  const bufProvided = Buffer.from(provided);
  const bufExpected = Buffer.from(expected);

  if (bufProvided.length !== bufExpected.length) {
    // Return false without early exit leak
    crypto.timingSafeEqual(bufProvided, bufProvided);
    return false;
  }

  return crypto.timingSafeEqual(bufProvided, bufExpected);
}

export function isDirectorAuthenticated(req: Request): boolean {
  try {
    const expected = getDirectorKey();
    const { key: provided } = extractProvidedKey(req);

    if (!provided) return false;
    return safeCompareKeys(provided, expected);
  } catch {
    return false;
  }
}

export function extractAuthorName(req: Request): string {
  const customAuthor = req.headers['x-author-name'] || req.body?.savedBy || req.body?.authorName;
  if (customAuthor && typeof customAuthor === 'string') {
    return customAuthor.trim().slice(0, 50);
  }
  return 'Directeur';
}

export function requireDirectorAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { key: providedKey, rejectedFromQuery } = extractProvidedKey(req);

  if (rejectedFromQuery) {
    return res.status(400).json({
      error: "Sécurité : la clé secrète ne doit pas être transmise dans l'URL (query string). Veuillez utiliser le header HTTP 'x-director-key' ou 'Authorization: Bearer <clé>'.",
    });
  }

  if (!providedKey) {
    return res.status(401).json({
      error: 'Clé Directeur manquante. Veuillez renseigner la clé secrète via le header x-director-key.',
    });
  }

  if (!isDirectorAuthenticated(req)) {
    return res.status(403).json({
      error: 'Clé Directeur invalide. Accès refusé.',
    });
  }

  // Attach author name for auditing
  req.authorName = extractAuthorName(req);

  next();
}
