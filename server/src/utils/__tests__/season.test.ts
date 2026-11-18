import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSeasonYear,
  getSeasonStartYear,
  getRoundDatesForSeason,
  getCurrentOrUpcomingRound,
  getSeasonConfig,
  DEFAULT_SEASON,
} from '../season';
import { isRoundInPast } from '../calendar';

describe('Season Utilities - normalizeSeasonYear', () => {
  it('converts single 4-digit start year into YYYY-YYYY format', () => {
    assert.equal(normalizeSeasonYear('2026'), '2026-2027');
    assert.equal(normalizeSeasonYear('2027'), '2027-2028');
  });

  it('keeps standard YYYY-YYYY format as is', () => {
    assert.equal(normalizeSeasonYear('2026-2027'), '2026-2027');
    assert.equal(normalizeSeasonYear('2025-2026'), '2025-2026');
  });

  it('normalizes en-dash or slash separated years', () => {
    assert.equal(normalizeSeasonYear('2026–2027'), '2026-2027');
    assert.equal(normalizeSeasonYear('2026/2027'), '2026-2027');
  });

  it('falls back to DEFAULT_SEASON for invalid or empty inputs', () => {
    assert.equal(normalizeSeasonYear(null), DEFAULT_SEASON);
    assert.equal(normalizeSeasonYear(undefined), DEFAULT_SEASON);
    assert.equal(normalizeSeasonYear(''), DEFAULT_SEASON);
    assert.equal(normalizeSeasonYear('invalid'), DEFAULT_SEASON);
  });
});

describe('Season Utilities - getSeasonStartYear', () => {
  it('extracts start year from full season string', () => {
    assert.equal(getSeasonStartYear('2026-2027'), '2026');
    assert.equal(getSeasonStartYear('2026'), '2026');
  });
});

describe('Season Utilities - getRoundDatesForSeason & Config', () => {
  it('returns exactly 11 official round dates for season 2026-2027', () => {
    const dates = getRoundDatesForSeason('2026-2027');
    assert.equal(dates.length, 11);
    assert.equal(dates[0], '2026-09-27');
    assert.equal(dates[10], '2027-04-18');
  });

  it('provides complete metadata via getSeasonConfig', () => {
    const config = getSeasonConfig('2026');
    assert.equal(config.seasonYear, '2026-2027');
    assert.equal(config.startYear, '2026');
    assert.equal(config.totalRounds, 11);
    assert.equal(config.divisionCsvFile, 'division_2026.csv');
    assert.equal(config.roundDates.length, 11);
    assert.ok(config.currentRound >= 1 && config.currentRound <= 11);
  });

  it('computes current or upcoming round accurately', () => {
    // Simulated date: 2026-10-01 (Between round 1 on 2026-09-27 and round 2 on 2026-10-11)
    const simulatedDate = new Date('2026-10-01T12:00:00Z');
    const r = getCurrentOrUpcomingRound('2026-2027', simulatedDate);
    assert.equal(r, 2);
  });
});

describe('Calendar Utilities - isRoundInPast', () => {
  it('returns true when simulated time is past round 1 match day 20:00', () => {
    // Round 1 was on 2026-09-27. Test on 2026-09-28
    const dayAfterR1 = new Date('2026-09-28T10:00:00Z');
    assert.equal(isRoundInPast(1, null, dayAfterR1), true);
  });

  it('returns false when simulated time is before round 1', () => {
    const beforeR1 = new Date('2026-09-20T10:00:00Z');
    assert.equal(isRoundInPast(1, null, beforeR1), false);
  });

  it('supports customDate overrides when provided', () => {
    const pastCustom = new Date('2026-01-01');
    const futureCustom = new Date('2028-01-01');
    const now = new Date('2026-06-01');

    assert.equal(isRoundInPast(1, pastCustom, now), true);
    assert.equal(isRoundInPast(1, futureCustom, now), false);
  });
});
