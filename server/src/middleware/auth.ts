import { Request, Response, NextFunction } from 'express';

export function requireDirectorAuth(req: Request, res: Response, next: NextFunction) {
  const directorKey = process.env.DIRECTOR_KEY || 'director1234';
  const providedKey = req.headers['x-director-key'] || req.query.directorKey;

  if (!providedKey) {
    return res.status(401).json({
      error: 'Clé Directeur manquante. Veuillez renseigner la clé secrète du Directeur.',
    });
  }

  if (providedKey !== directorKey) {
    return res.status(403).json({
      error: 'Clé Directeur invalide. Accès refusé.',
    });
  }

  next();
}

