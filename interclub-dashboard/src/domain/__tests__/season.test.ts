import { describe, it, expect } from 'vitest';
import {
  normalizeSeasonYear,
  getSeasonStartYear,
  defaultRound,
  calendarRound,
  ROUND_DATES,
  ACTIVE_SEASON,
  DEFAULT_SEASON_LABEL,
} from '../../season';

describe('Season Utilities - Frontend', () => {
  describe('normalizeSeasonYear', () => {
    it('normalizes single 4-digit start year to YYYY-YYYY', () => {
      expect(normalizeSeasonYear('2026')).toBe('2026-2027');
      expect(normalizeSeasonYear('2027')).toBe('2027-2028');
    });

    it('handles en-dash and slash representations', () => {
      expect(normalizeSeasonYear('2026–2027')).toBe('2026-2027');
      expect(normalizeSeasonYear('2026/2027')).toBe('2026-2027');
    });

    it('falls back to default season label on falsy input', () => {
      expect(normalizeSeasonYear(null)).toBe(DEFAULT_SEASON_LABEL);
      expect(normalizeSeasonYear(undefined)).toBe(DEFAULT_SEASON_LABEL);
      expect(normalizeSeasonYear('')).toBe(DEFAULT_SEASON_LABEL);
    });
  });

  describe('getSeasonStartYear', () => {
    it('extracts start year string consistently', () => {
      expect(getSeasonStartYear('2026-2027')).toBe('2026');
      expect(getSeasonStartYear('2026')).toBe('2026');
      expect(getSeasonStartYear('2027-2028')).toBe('2027');
    });
  });

  describe('defaultRound', () => {
    it('returns the same round regardless of whether year is "2026" or "2026-2027"', () => {
      const simulatedNow = new Date('2026-10-01T12:00:00Z');
      const roundFromShort = defaultRound('2026', simulatedNow);
      const roundFromFull = defaultRound('2026-2027', simulatedNow);

      expect(roundFromShort).toBe(roundFromFull);
      expect(roundFromShort).toBe(1); // 1 round has already passed on 2026-09-27
    });

    it('returns total rounds for a non-active season', () => {
      expect(defaultRound('2024')).toBe(ROUND_DATES.length);
    });
  });

  describe('calendarRound', () => {
    it('returns direct round for divisions 1 to 5', () => {
      expect(calendarRound(3, 4)).toBe(4);
    });

    it('maps skipped rounds for division 6 correctly', () => {
      // Division 6 plays rounds 1, 2, 3, 4, 7, 8, 9, 10, 11
      expect(calendarRound(6, 1)).toBe(1);
      expect(calendarRound(6, 4)).toBe(4);
      expect(calendarRound(6, 5)).toBe(7); // 5th match in div 6 is round 7
    });

    it('throws error for invalid round numbers', () => {
      expect(() => calendarRound(3, 0)).toThrow();
      expect(() => calendarRound(3, 12)).toThrow();
    });
  });
});
