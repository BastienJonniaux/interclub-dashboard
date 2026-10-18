import { Router } from 'express';
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
import { requireDirectorAuth } from '../middleware/auth';
import { prisma } from '../prisma';

export const apiRouter = Router();

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

// Director Key verification
apiRouter.post('/auth/verify', (req, res) => {
  const directorKey = process.env.DIRECTOR_KEY || 'director1234';
  const providedKey = req.body.key || req.headers['x-director-key'];

  if (!providedKey) {
    return res.status(400).json({ valid: false, error: 'Clé manquante.' });
  }

  if (providedKey === directorKey) {
    return res.json({ valid: true, message: 'Authentification Directeur réussie.' });
  }

  return res.status(401).json({ valid: false, error: 'Clé Directeur incorrecte.' });
});

// Draft compositions
apiRouter.get('/rounds/:roundNumber/drafts', getRoundDrafts);
apiRouter.post('/rounds/:roundNumber/drafts', requireDirectorAuth, saveRoundDrafts);
apiRouter.post('/rounds/:roundNumber/lock', requireDirectorAuth, toggleRoundLock);

// Player attendances / availability
apiRouter.get('/rounds/:roundNumber/attendances', getRoundAttendances);
apiRouter.put('/rounds/:roundNumber/attendances', requireDirectorAuth, saveRoundAttendances);

// Season stats
apiRouter.get('/stats/attendance', getSeasonAttendanceStats);

