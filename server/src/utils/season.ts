import { prisma } from '../prisma';

export const DEFAULT_SEASON = '2026-2027';
export const DEFAULT_CLUB_ID = 541;

export async function getOrCreateSeason(year: string = DEFAULT_SEASON) {
  let season = await prisma.season.findUnique({ where: { year } });
  if (!season) {
    season = await prisma.season.create({
      data: {
        year,
        isCurrent: true,
      },
    });
  }
  return season;
}

export function extractClubId(req: {
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: Record<string, any>;
}): number {
  const fromParams = req.params?.clubId;
  const fromQuery = req.query?.clubId;
  const fromBody = req.body?.clubId;

  const raw = fromParams || fromQuery || fromBody;
  if (raw !== undefined && raw !== null && raw !== '') {
    const parsed = parseInt(String(raw), 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return DEFAULT_CLUB_ID;
}
