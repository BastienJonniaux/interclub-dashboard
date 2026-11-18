import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getRoundDrafts,
  saveRoundDrafts,
  toggleRoundLock,
} from '../controllers/draftsController';
import {
  getRoundAttendances,
  saveRoundAttendances,
  getSeasonAttendanceStats,
} from '../controllers/attendancesController';
import {
  requireDirectorAuth,
  getDirectorKey,
  safeCompareKeys,
  extractProvidedKey,
} from '../middleware/auth';
import { prisma } from '../prisma';

export const apiRouter = Router();

// Rate limiter against brute-force on key verification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // max 10 attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    valid: false,
    error: 'Trop de tentatives infructueuses. Veuillez patienter 15 minutes avant de réessayer.',
  },
});

// Health check
apiRouter.get('/health', async (_req, res) => {
  try {
    // Quick ping to database
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: err.message,
    });
  }
});

// Director Key verification with rate-limiting and timing-safe comparison
apiRouter.post('/auth/verify', authLimiter, (req, res) => {
  const expectedKey = getDirectorKey();
  const { key: headerKey, rejectedFromQuery } = extractProvidedKey(req);
  const candidateKey = req.body?.key?.trim() || headerKey;

  if (rejectedFromQuery) {
    return res.status(400).json({
      valid: false,
      error: "Sécurité : la clé secrète ne doit pas être transmise dans l'URL (query string).",
    });
  }

  if (!candidateKey) {
    return res.status(400).json({ valid: false, error: 'Clé manquante.' });
  }

  if (safeCompareKeys(candidateKey, expectedKey)) {
    return res.json({ valid: true, message: 'Authentification Directeur réussie.' });
  }

  return res.status(401).json({ valid: false, error: 'Clé Directeur incorrecte.' });
});

// Draft compositions (query or body clubId supported, fallback to 541)
apiRouter.get('/rounds/:roundNumber/drafts', getRoundDrafts);
apiRouter.post('/rounds/:roundNumber/drafts', requireDirectorAuth, saveRoundDrafts);
apiRouter.post('/rounds/:roundNumber/lock', requireDirectorAuth, toggleRoundLock);

// Player attendances / availability
apiRouter.get('/rounds/:roundNumber/attendances', getRoundAttendances);
apiRouter.put('/rounds/:roundNumber/attendances', requireDirectorAuth, saveRoundAttendances);

// Season stats
apiRouter.get('/stats/attendance', getSeasonAttendanceStats);

// Explicit RESTful multi-club routes (/api/clubs/:clubId/...)
apiRouter.get('/clubs/:clubId/rounds/:roundNumber/drafts', getRoundDrafts);
apiRouter.post('/clubs/:clubId/rounds/:roundNumber/drafts', requireDirectorAuth, saveRoundDrafts);
apiRouter.post('/clubs/:clubId/rounds/:roundNumber/lock', requireDirectorAuth, toggleRoundLock);
apiRouter.get('/clubs/:clubId/rounds/:roundNumber/attendances', getRoundAttendances);
apiRouter.put('/clubs/:clubId/rounds/:roundNumber/attendances', requireDirectorAuth, saveRoundAttendances);
apiRouter.get('/clubs/:clubId/stats/attendance', getSeasonAttendanceStats);

