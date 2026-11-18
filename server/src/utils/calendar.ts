import {
  getRoundDatesForSeason,
  DEFAULT_SEASON,
  normalizeSeasonYear,
} from './season';

/**
 * Returns true if a round is strictly in the past (already played),
 * meaning the match day at 20:00 Brussels time has passed.
 */
export function isRoundInPast(
  roundNumber: number,
  customDate?: Date | null,
  now = new Date(),
  seasonYear: string = DEFAULT_SEASON
): boolean {
  if (roundNumber < 1) return false;

  if (customDate) {
    return now.getTime() > customDate.getTime();
  }

  const normalized = normalizeSeasonYear(seasonYear);
  const roundDates = getRoundDatesForSeason(normalized);
  if (roundNumber > roundDates.length) return false;

  const dateStr = roundDates[roundNumber - 1];
  if (!dateStr) return false;

  // Convert current time to Brussels local time components
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const localBrusselsISO = `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

  // Round is officially completed at 20:00:00 Brussels time on match day
  return localBrusselsISO >= `${dateStr}T20:00:00`;
}
