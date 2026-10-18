/**
 * Belgian Chess Federation (FRBE/KBSB) official round dates for Season 2026-2027.
 * Interclub matches are played on Sundays starting at 14:00 CET.
 */
export const ROUND_DATES_2026_2027 = [
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
];

/**
 * Returns true if a round is strictly in the past (already played),
 * meaning the match day at 20:00 Brussels time has passed.
 */
export function isRoundInPast(roundNumber: number, customDate?: Date | null, now = new Date()): boolean {
  if (roundNumber < 1 || roundNumber > 11) return false;

  if (customDate) {
    return now.getTime() > customDate.getTime();
  }

  const dateStr = ROUND_DATES_2026_2027[roundNumber - 1];
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
