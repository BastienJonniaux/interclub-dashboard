import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { DEFAULT_SEASON, getOrCreateSeason, extractClubId } from '../utils/season';

let settingsTableEnsured = false;

/**
 * Ensures the ClubPlayerSetting table exists even if `prisma db push`
 * has not been run yet in the target PostgreSQL environment.
 */
async function ensureSettingsTable(): Promise<void> {
  if (settingsTableEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClubPlayerSetting" (
      "id" TEXT NOT NULL,
      "seasonId" TEXT NOT NULL,
      "clubId" INTEGER NOT NULL DEFAULT 541,
      "playerId" INTEGER NOT NULL,
      "isIgnored" BOOLEAN NOT NULL DEFAULT false,
      "isBackup" BOOLEAN NOT NULL DEFAULT false,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ClubPlayerSetting_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ClubPlayerSetting_seasonId_clubId_playerId_key"
    ON "ClubPlayerSetting"("seasonId", "clubId", "playerId");
  `);
  settingsTableEnsured = true;
}

export async function getClubPlayerSettings(req: Request, res: Response) {
  try {
    await ensureSettingsTable();
    const seasonYear = (req.query.season as string) || DEFAULT_SEASON;
    const clubId = extractClubId(req);

    const season = await getOrCreateSeason(seasonYear);
    const rows = await prisma.clubPlayerSetting.findMany({
      where: {
        seasonId: season.id,
        clubId,
      },
    });

    const settings: Record<number, { isIgnored?: boolean; isBackup?: boolean }> = {};
    for (const row of rows) {
      if (row.isIgnored || row.isBackup) {
        settings[row.playerId] = {
          ...(row.isIgnored ? { isIgnored: true } : {}),
          ...(row.isBackup ? { isBackup: true } : {}),
        };
      }
    }

    return res.json({ clubId, seasonYear, settings });
  } catch (error) {
    console.error('Error getting club player settings:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de la configuration des joueurs.' });
  }
}

export async function saveClubPlayerSettings(req: Request, res: Response) {
  try {
    await ensureSettingsTable();
    const { seasonYear = DEFAULT_SEASON, settings } = req.body;
    const clubId = extractClubId(req);

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Format de configuration invalide.' });
    }

    const season = await getOrCreateSeason(seasonYear);

    const entries = Object.entries(settings as Record<string, { isIgnored?: boolean; isBackup?: boolean }>)
      .map(([pidStr, val]) => ({
        playerId: Number(pidStr),
        isIgnored: Boolean(val?.isIgnored),
        isBackup: Boolean(val?.isBackup),
      }))
      .filter((e) => !isNaN(e.playerId) && (e.isIgnored || e.isBackup));

    await prisma.$transaction(async (tx) => {
      await tx.clubPlayerSetting.deleteMany({
        where: {
          seasonId: season.id,
          clubId,
        },
      });

      if (entries.length > 0) {
        await tx.clubPlayerSetting.createMany({
          data: entries.map((e) => ({
            seasonId: season.id,
            clubId,
            playerId: e.playerId,
            isIgnored: e.isIgnored,
            isBackup: e.isBackup,
          })),
        });
      }
    });

    return res.json({
      success: true,
      clubId,
      seasonYear,
      savedCount: entries.length,
    });
  } catch (error) {
    console.error('Error saving club player settings:', error);
    return res.status(500).json({ error: 'Erreur lors de la sauvegarde de la configuration des joueurs.' });
  }
}
