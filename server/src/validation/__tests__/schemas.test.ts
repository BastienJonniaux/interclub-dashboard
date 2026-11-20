import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { saveDraftsSchema, lockRoundSchema } from '../schemas';

describe('Server Validation Schemas - saveDraftsSchema', () => {
  it('accepts a valid draft payload', () => {
    const validPayload = {
      seasonYear: '2026-2027',
      clubId: 541,
      savedBy: 'Bastien',
      drafts: {
        '1': {
          divisionLabel: '3C',
          boards: [
            { board: 1, playerId: 1001, playerName: 'Player One', playerRating: 2000 },
            { board: 2, playerId: 1002, playerName: 'Player Two', playerRating: 1950 },
          ],
        },
        '2': {
          divisionLabel: '4A',
          boards: [
            { board: 1, playerId: 2001, playerName: 'Player Three', playerRating: 1800 },
          ],
        },
      },
    };

    const result = saveDraftsSchema.safeParse(validPayload);
    assert.equal(result.success, true);
  });

  it('rejects duplicate boards within the same team', () => {
    const duplicateBoardPayload = {
      drafts: {
        '1': {
          divisionLabel: '3C',
          boards: [
            { board: 1, playerId: 1001 },
            { board: 1, playerId: 1002 }, // Duplicate board 1
          ],
        },
      },
    };

    const result = saveDraftsSchema.safeParse(duplicateBoardPayload);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.message.includes('échiquier 1 est assigné plusieurs fois')));
    }
  });

  it('rejects a player assigned across multiple teams in the same round', () => {
    const duplicatePlayerPayload = {
      drafts: {
        '1': {
          divisionLabel: '3C',
          boards: [{ board: 1, playerId: 99999 }],
        },
        '2': {
          divisionLabel: '4A',
          boards: [{ board: 1, playerId: 99999 }], // Same player in Team 2
        },
      },
    };

    const result = saveDraftsSchema.safeParse(duplicatePlayerPayload);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.message.includes('99999')));
    }
  });

  it('rejects board numbers outside 1-8', () => {
    const invalidBoardPayload = {
      drafts: {
        '1': {
          boards: [{ board: 9, playerId: 1001 }], // Board 9 invalid
        },
      },
    };

    const result = saveDraftsSchema.safeParse(invalidBoardPayload);
    assert.equal(result.success, false);
  });

  it('rejects non-integer or negative player IDs', () => {
    const invalidPlayerIdPayload = {
      drafts: {
        '1': {
          boards: [{ board: 1, playerId: -5 }],
        },
      },
    };

    const result = saveDraftsSchema.safeParse(invalidPlayerIdPayload);
    assert.equal(result.success, false);
  });
});

describe('Server Validation Schemas - lockRoundSchema', () => {
  it('parses valid lock payload with defaults', () => {
    const result = lockRoundSchema.safeParse({});
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.lock, true);
    }
  });

  it('accepts explicit lock false and metadata', () => {
    const result = lockRoundSchema.safeParse({
      lock: false,
      seasonYear: '2026-2027',
      clubId: 541,
      savedBy: 'Directeur',
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.lock, false);
      assert.equal(result.data.savedBy, 'Directeur');
    }
  });
});
