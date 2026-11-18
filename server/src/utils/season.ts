import { prisma } from '../prisma';

export const DEFAULT_SEASON = '2026-2027';
export const DEFAULT_CLUB_ID = 541;

/**
 * Official round calendar dates per season (FRBE calendar).
 * Matches are played on Sundays starting at 14:00 CET.
 */
export const OFFICIAL_SEASON_CALENDARS: Record<string, string[]> = {
  '2026-2027': [
    '2026-09-27', // Ronde 1
    '2026-10-11', // Ronde 2
    '2026-11-15', // Ronde 3
    '2026-11-29', // Ronde 4
    '2026-12-20', // Ronde 5
    '2027-01-31', // Ronde 6
    '2027-02-14', // Ronde 7
    '2027-03-07', // Ronde 8
    '2027-03-21', // Ronde 9
    '2027-04-11', // Ronde 10
    '2027-04-18', // Ronde 11
  ],
};

/**
 * Normalizes various season notations into standard "YYYY-YYYY" format.
 * Examples: "2026" -> "2026-2027", "2026–2027" -> "2026-2027", "2026/2027" -> "2026-2027"
 */
export function normalizeSeasonYear(seasonInput?: string | null): string {
  if (!seasonInput || typeof seasonInput !== 'string') {
    return DEFAULT_SEASON;
  }

  const cleaned = seasonInput.trim().replace(/[\u2013\u2014\/]/g, '-');

  // Match 4 digits: "2026" -> "2026-2027"
  if (/^\d{4}$/.test(cleaned)) {
    const startYear = parseInt(cleaned, 10);
    return `${startYear}-${startYear + 1}`;
  }

  // Match "YYYY-YYYY": "2026-2027"
  if (/^\d{4}-\d{4}$/.test(cleaned)) {
    return cleaned;
  }

  return DEFAULT_SEASON;
}

/**
 * Extracts starting year string (e.g. "2026" from "2026-2027")
 */
export function getSeasonStartYear(seasonYear: string = DEFAULT_SEASON): string {
  const norm = normalizeSeasonYear(seasonYear);
  return norm.split('-')[0];
}

/**
 * Retrieves the official round dates array for a given season
 */
export function getRoundDatesForSeason(seasonYear: string = DEFAULT_SEASON): string[] {
  const norm = normalizeSeasonYear(seasonYear);
  return OFFICIAL_SEASON_CALENDARS[norm] || OFFICIAL_SEASON_CALENDARS[DEFAULT_SEASON];
}

/**
 * Determines current/upcoming round number based on today's date in Europe/Brussels
 */
export function getCurrentOrUpcomingRound(seasonYear: string = DEFAULT_SEASON, now = new Date()): number {
  const dates = getRoundDatesForSeason(seasonYear);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(now);

  for (let i = 0; i < dates.length; i++) {
    if (dates[i] >= today) {
      return i + 1;
    }
  }

  return dates.length;
}

/**
 * Returns complete configuration metadata for a season
 */
export function getSeasonConfig(seasonYear?: string | null, now = new Date()) {
  const normalized = normalizeSeasonYear(seasonYear);
  const startYear = getSeasonStartYear(normalized);
  const roundDates = getRoundDatesForSeason(normalized);
  const currentRound = getCurrentOrUpcomingRound(normalized, now);

  return {
    seasonYear: normalized,
    startYear,
    seasonLabel: `${startYear}–${parseInt(startYear, 10) + 1}`,
    divisionCsvFile: `division_${startYear}.csv`,
    totalRounds: roundDates.length,
    currentRound,
    roundDates,
  };
}

export async function getOrCreateSeason(yearInput: string = DEFAULT_SEASON) {
  const year = normalizeSeasonYear(yearInput);
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
