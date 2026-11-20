import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRoundDrafts,
  parseDivisionFromLabel,
  getRequiredBoardCount,
} from '../frbeRules';

describe('Server FRBE Rules - Helpers', () => {
  it('parses division number from division labels', () => {
    assert.equal(parseDivisionFromLabel('1'), 1);
    assert.equal(parseDivisionFromLabel('2B'), 2);
    assert.equal(parseDivisionFromLabel('3C'), 3);
    assert.equal(parseDivisionFromLabel('5A'), 5);
    assert.equal(parseDivisionFromLabel(null), 4);
    assert.equal(parseDivisionFromLabel(''), 4);
  });

  it('determines required boards count per division', () => {
    assert.equal(getRequiredBoardCount(1), 8);
    assert.equal(getRequiredBoardCount(2), 8);
    assert.equal(getRequiredBoardCount(3), 6);
    assert.equal(getRequiredBoardCount(4), 4);
    assert.equal(getRequiredBoardCount(5), 4);
    assert.equal(getRequiredBoardCount(6), 4);
  });
});

describe('Server FRBE Rules - validateRoundDrafts', () => {
  it('detects incomplete team compositions with warnings', () => {
    const drafts = {
      1: {
        divisionLabel: '3C', // requires 6 boards
        boards: [
          { board: 1, playerId: 1, playerRating: 1900 },
          { board: 2, playerId: 2, playerRating: 1850 },
        ],
      },
    };

    const result = validateRoundDrafts(drafts);
    assert.equal(result.hasWarnings, true);
    assert.ok(result.violations.some((v) => v.rule === 'COMPOSITION_INCOMPLETE'));
  });

  it('flags error when titular of Team 1 plays down in Team 2', () => {
    const drafts = {
      2: {
        divisionLabel: '4A',
        boards: [
          {
            board: 1,
            playerId: 10,
            playerName: 'Jean Dupont',
            playerRating: 1800,
            titular: '1', // Titular Team 1
          },
        ],
      },
    };

    const result = validateRoundDrafts(drafts);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.rule === 'TITULAR_PLAYING_DOWN'));
  });

  it('flags error when reservist exceeds division Elo ceiling', () => {
    const drafts = {
      1: {
        divisionLabel: '3C', // Max reserve 2050
        boards: [
          {
            board: 1,
            playerId: 20,
            playerRating: 2150, // Exceeds 2050
            titular: '', // Reservist
          },
        ],
      },
    };

    const result = validateRoundDrafts(drafts);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.rule === 'RESERVE_ELO_LIMIT'));
  });

  it('enforces Division 1 minimum Elo rules (1800 floor and 2000 top 4)', () => {
    const drafts = {
      1: {
        divisionLabel: '1',
        boards: [
          { board: 1, playerId: 1, playerRating: 2100 },
          { board: 2, playerId: 2, playerRating: 1950 }, // < 2000 on board 2!
          { board: 5, playerId: 5, playerRating: 1750 }, // < 1800 on board 5!
        ],
      },
    };

    const result = validateRoundDrafts(drafts);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.rule === 'DIV1_TOP4_MIN_ELO'));
    assert.ok(result.violations.some((v) => v.rule === 'DIV1_MIN_ELO'));
  });

  it('flags cross-team average violations between higher and lower teams', () => {
    const drafts = {
      1: {
        divisionLabel: '3C',
        boards: [{ board: 1, playerId: 1, playerRating: 1600 }],
      },
      2: {
        divisionLabel: '4A',
        boards: [{ board: 1, playerId: 2, playerRating: 1900 }], // Team 2 avg > Team 1 avg
      },
    };

    const result = validateRoundDrafts(drafts);
    assert.equal(result.isValid, false);
    assert.ok(result.violations.some((v) => v.rule === 'CROSS_TEAM_AVG'));
  });

  it('exempts cross-team average comparisons when both teams are Div 4, 5, or 6', () => {
    const drafts = {
      2: {
        divisionLabel: '4A',
        boards: [{ board: 1, playerId: 1, playerRating: 1500 }],
      },
      3: {
        divisionLabel: '5B',
        boards: [{ board: 1, playerId: 2, playerRating: 1650 }],
      },
    };

    const result = validateRoundDrafts(drafts);
    assert.ok(!result.violations.some((v) => v.rule === 'CROSS_TEAM_AVG'));
  });
});
