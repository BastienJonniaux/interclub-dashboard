import { describe, it, expect } from 'vitest';
import {
  validateTeamComposition,
  validateCrossTeamAverages,
  AssignedBoard,
  RESERVE_ELO_LIMITS,
} from '../frbeValidator';
import { PlayerFrbe, TeamFrbe } from '../../../modelsFRBE';

function createMockPlayer(overrides: Partial<PlayerFrbe> = {}): PlayerFrbe {
  return {
    idnumber: 10001,
    last_name: 'Dupont',
    first_name: 'Jean',
    assignedrating: 1900,
    average: 1900,
    idcluborig: 541,
    idclubvisit: 0,
    nature: 'O',
    titular: '',
    ...overrides,
  };
}

function createMockTeam(overrides: Partial<TeamFrbe> = {}): TeamFrbe {
  return {
    division: 3,
    index: 'A',
    name: 'Leuze 1',
    idclub: 541,
    pairingnumber: 1,
    titular: [],
    playersplayed: [],
    ...overrides,
  };
}

describe('FRBE Rules Validator - validateTeamComposition', () => {
  describe('Completeness Check', () => {
    it('should warn when team composition is incomplete', () => {
      // Division 3 requires 6 boards
      const boards: AssignedBoard[] = [
        { board: 1, player: createMockPlayer({ idnumber: 1, assignedrating: 2000 }) },
        { board: 2, player: createMockPlayer({ idnumber: 2, assignedrating: 1950 }) },
        { board: 3, player: null },
        { board: 4, player: null },
        { board: 5, player: null },
        { board: 6, player: null },
      ];

      const result = validateTeamComposition(1, 3, boards);

      expect(result.assignedCount).toBe(2);
      expect(result.totalBoards).toBe(6);
      expect(result.hasWarnings).toBe(true);
      expect(result.violations.some((v) => v.rule === 'COMPOSITION_INCOMPLETE')).toBe(true);
    });

    it('should have no completeness warning when all boards are filled', () => {
      const boards: AssignedBoard[] = [
        { board: 1, player: createMockPlayer({ idnumber: 1, assignedrating: 2000 }) },
        { board: 2, player: createMockPlayer({ idnumber: 2, assignedrating: 1950 }) },
        { board: 3, player: createMockPlayer({ idnumber: 3, assignedrating: 1900 }) },
        { board: 4, player: createMockPlayer({ idnumber: 4, assignedrating: 1850 }) },
      ];

      // Division 4 requires 4 boards
      const result = validateTeamComposition(2, 4, boards);

      expect(result.assignedCount).toBe(4);
      expect(result.totalBoards).toBe(4);
      expect(result.violations.some((v) => v.rule === 'COMPOSITION_INCOMPLETE')).toBe(false);
    });
  });

  describe('Duplicate Players', () => {
    it('should trigger an error if the same player is assigned to multiple boards', () => {
      const player = createMockPlayer({ idnumber: 999, assignedrating: 1900 });
      const boards: AssignedBoard[] = [
        { board: 1, player },
        { board: 2, player }, // Duplicate
        { board: 3, player: createMockPlayer({ idnumber: 3, assignedrating: 1800 }) },
        { board: 4, player: createMockPlayer({ idnumber: 4, assignedrating: 1750 }) },
      ];

      const result = validateTeamComposition(2, 4, boards);

      expect(result.isValid).toBe(false);
      const dupViolation = result.violations.find((v) => v.rule === 'DUPLICATE_PLAYER');
      expect(dupViolation).toBeDefined();
      expect(dupViolation?.type).toBe('error');
      expect(dupViolation?.board).toBe(2);
    });
  });

  describe('Titular Playing Down Rule', () => {
    it('should forbid a titular of Team 1 from playing in Team 2', () => {
      const titularT1 = createMockPlayer({
        idnumber: 123,
        first_name: 'Alice',
        last_name: 'Martin',
        titular: '1', // Titular Team 1
        assignedrating: 1900,
      });

      const boards: AssignedBoard[] = [
        { board: 1, player: titularT1 },
        { board: 2, player: createMockPlayer({ idnumber: 2, assignedrating: 1850 }) },
        { board: 3, player: createMockPlayer({ idnumber: 3, assignedrating: 1800 }) },
        { board: 4, player: createMockPlayer({ idnumber: 4, assignedrating: 1750 }) },
      ];

      // We are validating Team 2
      const result = validateTeamComposition(2, 4, boards);

      expect(result.isValid).toBe(false);
      const violation = result.violations.find((v) => v.rule === 'TITULAR_PLAYING_DOWN');
      expect(violation).toBeDefined();
      expect(violation?.message).toContain('titulaire en équipe 1 et ne peut pas descendre en équipe 2');
    });

    it('should allow a titular of Team 2 to play in Team 1 (playing up)', () => {
      const titularT2 = createMockPlayer({
        idnumber: 456,
        titular: '2', // Titular Team 2
        assignedrating: 1900,
      });

      const boards: AssignedBoard[] = [
        { board: 1, player: createMockPlayer({ idnumber: 1, assignedrating: 2100 }) },
        { board: 2, player: titularT2 }, // Playing UP in Team 1
        { board: 3, player: createMockPlayer({ idnumber: 3, assignedrating: 1950 }) },
        { board: 4, player: createMockPlayer({ idnumber: 4, assignedrating: 1900 }) },
        { board: 5, player: createMockPlayer({ idnumber: 5, assignedrating: 1850 }) },
        { board: 6, player: createMockPlayer({ idnumber: 6, assignedrating: 1800 }) },
      ];

      // We are validating Team 1 (Div 3)
      const result = validateTeamComposition(1, 3, boards);

      expect(result.violations.some((v) => v.rule === 'TITULAR_PLAYING_DOWN')).toBe(false);
    });
  });

  describe('Reserve Elo Limits', () => {
    it('should reject a reservist exceeding the division limit', () => {
      // In Div 3, max reserve Elo is 2050
      const strongReserve = createMockPlayer({
        idnumber: 789,
        titular: '', // Reservist
        assignedrating: 2150, // > 2050
      });

      const boards: AssignedBoard[] = [
        { board: 1, player: strongReserve },
        { board: 2, player: createMockPlayer({ idnumber: 2, assignedrating: 2000 }) },
        { board: 3, player: createMockPlayer({ idnumber: 3, assignedrating: 1950 }) },
        { board: 4, player: createMockPlayer({ idnumber: 4, assignedrating: 1900 }) },
        { board: 5, player: createMockPlayer({ idnumber: 5, assignedrating: 1850 }) },
        { board: 6, player: createMockPlayer({ idnumber: 6, assignedrating: 1800 }) },
      ];

      const result = validateTeamComposition(1, 3, boards);

      expect(result.isValid).toBe(false);
      const violation = result.violations.find((v) => v.rule === 'RESERVE_ELO_LIMIT');
      expect(violation).toBeDefined();
      expect(violation?.message).toContain(`2050 Elo`);
    });

    it('should allow a titular of that team even if their Elo exceeds the reserve limit', () => {
      // In Div 3, limit for reserves is 2050. But if player is TITULAR of Team 1, limit does not apply
      const titularPlayer = createMockPlayer({
        idnumber: 789,
        titular: '1', // Titular Team 1
        assignedrating: 2150,
      });

      const boards: AssignedBoard[] = [
        { board: 1, player: titularPlayer },
        { board: 2, player: createMockPlayer({ idnumber: 2, assignedrating: 2000 }) },
        { board: 3, player: createMockPlayer({ idnumber: 3, assignedrating: 1950 }) },
        { board: 4, player: createMockPlayer({ idnumber: 4, assignedrating: 1900 }) },
        { board: 5, player: createMockPlayer({ idnumber: 5, assignedrating: 1850 }) },
        { board: 6, player: createMockPlayer({ idnumber: 6, assignedrating: 1800 }) },
      ];

      const result = validateTeamComposition(1, 3, boards);

      expect(result.violations.some((v) => v.rule === 'RESERVE_ELO_LIMIT')).toBe(false);
    });
  });

  describe('Division 1 Specific Rules', () => {
    it('should forbid any player under 1800 Elo in Division 1', () => {
      const lowElo = createMockPlayer({
        idnumber: 101,
        titular: '1',
        assignedrating: 1750, // < 1800
      });

      const boards: AssignedBoard[] = Array.from({ length: 8 }, (_, i) => ({
        board: i + 1,
        player: i === 7 ? lowElo : createMockPlayer({ idnumber: i + 1, assignedrating: 2100 - i * 10 }),
      }));

      const result = validateTeamComposition(1, 1, boards);

      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.rule === 'DIV1_MIN_ELO')).toBe(true);
    });

    it('should require boards 1 to 4 to have at least 2000 Elo in Division 1', () => {
      const board4Player = createMockPlayer({
        idnumber: 104,
        assignedrating: 1950, // < 2000 on board 4
      });

      const boards: AssignedBoard[] = Array.from({ length: 8 }, (_, i) => ({
        board: i + 1,
        player: i === 3 ? board4Player : createMockPlayer({ idnumber: i + 1, assignedrating: 2200 - i * 20 }),
      }));

      const result = validateTeamComposition(1, 1, boards);

      expect(result.isValid).toBe(false);
      const violation = result.violations.find((v) => v.rule === 'DIV1_TOP4_MIN_ELO');
      expect(violation).toBeDefined();
      expect(violation?.board).toBe(4);
    });
  });

  describe('Board Order Constraint', () => {
    it('should allow valid permutation within tolerance limit', () => {
      // In Div 4, max allowed diff is 1 place
      // Theoretical: 1900, 1850, 1800, 1750
      // Actual lineup: board 1: 1850 (diff 1), board 2: 1900 (diff 1), board 3: 1800, board 4: 1750
      const boards: AssignedBoard[] = [
        { board: 1, player: createMockPlayer({ idnumber: 1, assignedrating: 1850 }) },
        { board: 2, player: createMockPlayer({ idnumber: 2, assignedrating: 1900 }) },
        { board: 3, player: createMockPlayer({ idnumber: 3, assignedrating: 1800 }) },
        { board: 4, player: createMockPlayer({ idnumber: 4, assignedrating: 1750 }) },
      ];

      const result = validateTeamComposition(2, 4, boards);

      expect(result.violations.some((v) => v.rule === 'BOARD_ORDER_VIOLATION')).toBe(false);
    });

    it('should reject a player shifted beyond tolerance limit', () => {
      // In Div 4, max diff is 1.
      // If highest player (2000) is placed on board 3 (theoretical rank 0, actual index 2 -> diff 2)
      const boards: AssignedBoard[] = [
        { board: 1, player: createMockPlayer({ idnumber: 1, assignedrating: 1800 }) },
        { board: 2, player: createMockPlayer({ idnumber: 2, assignedrating: 1750 }) },
        { board: 3, player: createMockPlayer({ idnumber: 3, assignedrating: 2000 }) }, // Shift of 2 places
        { board: 4, player: createMockPlayer({ idnumber: 4, assignedrating: 1700 }) },
      ];

      const result = validateTeamComposition(2, 4, boards);

      expect(result.isValid).toBe(false);
      const violation = result.violations.find((v) => v.rule === 'BOARD_ORDER_VIOLATION');
      expect(violation).toBeDefined();
      expect(violation?.board).toBe(3);
    });
  });
});

describe('FRBE Rules Validator - validateCrossTeamAverages', () => {
  it('should flag an error if Team 1 has a lower average than Team 2', () => {
    const teams: TeamFrbe[] = [
      createMockTeam({ name: 'Leuze 1', division: 3, index: 'A' }),
      createMockTeam({ name: 'Leuze 2', division: 4, index: 'B' }),
    ];

    const players: PlayerFrbe[] = [
      // Team 1: Avg = 1750
      createMockPlayer({ idnumber: 101, assignedrating: 1750 }),
      createMockPlayer({ idnumber: 102, assignedrating: 1750 }),
      // Team 2: Avg = 1900
      createMockPlayer({ idnumber: 201, assignedrating: 1900 }),
      createMockPlayer({ idnumber: 202, assignedrating: 1900 }),
    ];

    const drafts = {
      1: { 1: 101, 2: 102 },
      2: { 1: 201, 2: 202 },
    };

    const violations = validateCrossTeamAverages(teams, drafts, players);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].rule).toBe('CROSS_TEAM_AVG');
    expect(violations[0].message).toContain('Leuze 1');
    expect(violations[0].message).toContain('inférieure à Leuze 2');
  });

  it('should exempt pairs of teams when both are in Division 4, 5, or 6', () => {
    const teams: TeamFrbe[] = [
      createMockTeam({ name: 'Leuze 2', division: 4, index: 'A' }),
      createMockTeam({ name: 'Leuze 3', division: 5, index: 'B' }),
    ];

    const players: PlayerFrbe[] = [
      // Team 2 (Div 4): Avg = 1500
      createMockPlayer({ idnumber: 101, assignedrating: 1500 }),
      // Team 3 (Div 5): Avg = 1600 (higher than Team 2, but both in Div >= 4)
      createMockPlayer({ idnumber: 201, assignedrating: 1600 }),
    ];

    const drafts = {
      1: { 1: 101 },
      2: { 1: 201 },
    };

    const violations = validateCrossTeamAverages(teams, drafts, players);

    // Rule exemption: both teams are >= Div 4
    expect(violations.length).toBe(0);
  });
});
