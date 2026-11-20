import { describe, it, expect } from 'vitest';
import {
  calculateMatchBoardProbabilities,
  extractRemainingMatches,
  calculateMathematicalRankBounds,
  calculateDivisionProjections,
  getDivisionPairings,
  getDivisionRules,
  distributeIntegerPercentages,
} from '../projections';
import { DivisionFrbe, TeamFrbe, RoundFrbe } from '../../modelsFRBE';
import { DivisionStandingTable, TeamStanding } from '../standings';

describe('Projections Domain - getDivisionRules', () => {
  it('enforces official FRBE promotion and relegation rules per division', () => {
    // Div 1: Title, 0 promotion, 2 relegations (11-12)
    const d1 = getDivisionRules(1, 12);
    expect(d1.promotionSpots).toBe(0);
    expect(d1.relegationSpots).toBe(2);
    expect(d1.hasTitle).toBe(true);
    expect(d1.safeRankMax).toBe(10);

    // Div 2, 3, 4: 1 promotion (champion), 2 relegations
    const d3 = getDivisionRules(3, 12);
    expect(d3.promotionSpots).toBe(1);
    expect(d3.relegationSpots).toBe(2);
    expect(d3.safeRankMax).toBe(10);

    // Div 5: 2 promotions (1st and 2nd), 2 relegations
    const d5 = getDivisionRules(5, 12);
    expect(d5.promotionSpots).toBe(2);
    expect(d5.relegationSpots).toBe(2);
    expect(d5.safeRankMax).toBe(10);

    // Div 6: 1 promotion, 0 relegations
    const d6 = getDivisionRules(6, 10);
    expect(d6.promotionSpots).toBe(1);
    expect(d6.relegationSpots).toBe(0);
    expect(d6.safeRankMax).toBe(10);
  });
});

describe('Projections Domain - distributeIntegerPercentages (Largest Remainder Method)', () => {
  it('guarantees that distributed integer percentages sum to exactly 100', () => {
    const raw = [33.333, 33.333, 33.334];
    const ints = distributeIntegerPercentages(raw);
    expect(ints.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('handles 12-element arrays with many fractional remainders', () => {
    const raw = [28.4, 21.8, 14.1, 11.2, 8.7, 5.3, 4.1, 2.9, 1.8, 1.1, 0.4, 0.2];
    const ints = distributeIntegerPercentages(raw);
    expect(ints).toHaveLength(12);
    expect(ints.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('Projections Domain - calculateMatchBoardProbabilities', () => {
  it('gives symmetric probabilities when ratings are equal', () => {
    const probs = calculateMatchBoardProbabilities(1800, 1800);
    expect(probs.pWin).toBeCloseTo(probs.pLoss, 3);
    expect(probs.pWin + probs.pDraw + probs.pLoss).toBeCloseTo(1, 4);
    expect(probs.pDraw).toBeGreaterThan(0.2);
  });

  it('favors higher-rated team when Elo difference is positive', () => {
    const probs = calculateMatchBoardProbabilities(2000, 1600); // +400 Elo
    expect(probs.pWin).toBeGreaterThan(0.65);
    expect(probs.pLoss).toBeLessThan(0.18);
    expect(probs.pWin + probs.pDraw + probs.pLoss).toBeCloseTo(1, 4);
  });

  it('favors opponent when Elo difference is negative', () => {
    const probs = calculateMatchBoardProbabilities(1500, 1900); // -400 Elo
    expect(probs.pLoss).toBeGreaterThan(0.65);
    expect(probs.pWin).toBeLessThan(0.18);
    expect(probs.pWin + probs.pDraw + probs.pLoss).toBeCloseTo(1, 4);
  });

  it('handles unknown or zero ratings by defaulting gracefully', () => {
    const probs = calculateMatchBoardProbabilities(0, 0);
    expect(probs.pWin).toBeCloseTo(probs.pLoss, 2);
    expect(probs.pWin + probs.pDraw + probs.pLoss).toBeCloseTo(1, 4);
  });
});

describe('Projections Domain - extractRemainingMatches & pairings', () => {
  it('returns 66 matches for a fresh 12-team division with 0 rounds played', () => {
    const teams: TeamFrbe[] = Array.from({ length: 12 }, (_, i) => ({
      division: 3,
      index: 'A',
      idclub: 100 + i,
      name: `Team ${i + 1}`,
      pairingnumber: i + 1,
      titular: [],
      playersplayed: [],
    }));

    const division: DivisionFrbe = {
      division: 3,
      index: 'A',
      teams,
      rounds: [],
    };

    const remaining = extractRemainingMatches(division, 12);
    expect(remaining).toHaveLength(66); // 11 rounds * 6 matches
  });

  it('excludes already played encounters', () => {
    const teams: TeamFrbe[] = Array.from({ length: 12 }, (_, i) => ({
      division: 3,
      index: 'A',
      idclub: 100 + i,
      name: `Team ${i + 1}`,
      pairingnumber: i + 1,
      titular: [],
      playersplayed: [],
    }));

    const round1: RoundFrbe = {
      round: 1,
      rdate: '2026-09-27',
      encounters: [
        {
          icclub_home: 100,
          icclub_visit: 111,
          pairingnr_home: 1,
          pairingnr_visit: 12,
          matchpoint_home: 2,
          matchpoint_visit: 0,
          boardpoint2_home: 8,
          boardpoint2_visit: 4,
          games: [],
          played: true,
          signhome_idnumber: 0,
          signhome_ts: null,
          signvisit_idnumber: 0,
          signvisit_ts: null,
        },
      ],
    };

    const division: DivisionFrbe = {
      division: 3,
      index: 'A',
      teams,
      rounds: [round1],
    };

    const remaining = extractRemainingMatches(division, 12);
    expect(remaining).toHaveLength(65);
    const has1vs12 = remaining.some(
      (m) => m.round === 1 && m.homePairingNr === 1 && m.awayPairingNr === 12
    );
    expect(has1vs12).toBe(false);
  });
});

describe('Projections Domain - calculateMathematicalRankBounds', () => {
  it('identifies guaranteed champion when lead is insurmountable', () => {
    const teams: TeamStanding[] = [
      {
        rank: 1,
        clubId: 101,
        teamName: 'Leader',
        pairingNumber: 1,
        played: 10,
        won: 9,
        drawn: 0,
        lost: 1,
        matchPoints: 18,
        boardPoints: 40,
        isOurClub: true,
        matchHistory: [],
        seasonAvgElo: 2100,
        seasonOppAvgElo: 1900,
      },
      {
        rank: 2,
        clubId: 102,
        teamName: 'Second',
        pairingNumber: 2,
        played: 10,
        won: 7,
        drawn: 0,
        lost: 3,
        matchPoints: 14,
        boardPoints: 35,
        isOurClub: false,
        matchHistory: [],
        seasonAvgElo: 2000,
        seasonOppAvgElo: 1900,
      },
    ];

    for (let i = 3; i <= 12; i++) {
      teams.push({
        rank: i,
        clubId: 100 + i,
        teamName: `Team ${i}`,
        pairingNumber: i,
        played: 10,
        won: 4,
        drawn: 0,
        lost: 6,
        matchPoints: 8,
        boardPoints: 20,
        isOurClub: false,
        matchHistory: [],
        seasonAvgElo: 1700,
        seasonOppAvgElo: 1900,
      });
    }

    const standings: DivisionStandingTable = {
      division: 2,
      index: 'A',
      divisionLabel: 'Division 2A',
      teams,
    };

    const remainingMatches = [
      { round: 11, homePairingNr: 1, awayPairingNr: 2 },
    ];

    const bounds = calculateMathematicalRankBounds(standings, remainingMatches);
    const leaderBounds = bounds.get(1);

    expect(leaderBounds).toBeDefined();
    expect(leaderBounds?.minRank).toBe(1);
    expect(leaderBounds?.maxRank).toBe(1);
  });

  it('identifies guaranteed Top 10 (maintien assuré) when safe from 11th place', () => {
    const teams: TeamStanding[] = Array.from({ length: 12 }, (_, i) => {
      const rank = i + 1;
      let mp = 14;
      if (rank === 1) mp = 16;
      else if (rank <= 6) mp = 14;
      else if (rank <= 10) mp = 10;
      else mp = 2; // ranks 11-12 have 2 points

      return {
        rank,
        clubId: 100 + rank,
        teamName: `Team ${rank}`,
        pairingNumber: rank,
        played: 9,
        won: Math.floor(mp / 2),
        drawn: 0,
        lost: 9 - Math.floor(mp / 2),
        matchPoints: mp,
        boardPoints: mp * 2,
        isOurClub: rank === 4,
        matchHistory: [],
        seasonAvgElo: 1800,
        seasonOppAvgElo: 1800,
      };
    });

    const standings: DivisionStandingTable = {
      division: 3,
      index: 'B',
      divisionLabel: 'Division 3B',
      teams,
    };

    const remainingMatches = [
      { round: 10, homePairingNr: 1, awayPairingNr: 2 },
      { round: 10, homePairingNr: 3, awayPairingNr: 4 },
      { round: 10, homePairingNr: 11, awayPairingNr: 12 },
    ];

    const bounds = calculateMathematicalRankBounds(standings, remainingMatches);
    const team4Bounds = bounds.get(4);

    expect(team4Bounds).toBeDefined();
    expect(team4Bounds?.maxRank).toBeLessThanOrEqual(10);
  });
});

describe('Projections Domain - calculateDivisionProjections', () => {
  it('returns 100% certainty for all teams when season is completed', () => {
    const teams: TeamFrbe[] = Array.from({ length: 12 }, (_, i) => ({
      division: 4,
      index: 'A',
      idclub: 100 + i,
      name: `Team ${i + 1}`,
      pairingnumber: i + 1,
      titular: [],
      playersplayed: [],
    }));

    const standings: DivisionStandingTable = {
      division: 4,
      index: 'A',
      divisionLabel: 'Division 4A',
      teams: teams.map((t, idx) => ({
        rank: idx + 1,
        clubId: t.idclub,
        teamName: t.name,
        pairingNumber: t.pairingnumber,
        played: 11,
        won: 11 - idx,
        drawn: 0,
        lost: idx,
        matchPoints: (11 - idx) * 2,
        boardPoints: (11 - idx) * 4,
        isOurClub: idx === 0,
        matchHistory: Array.from({ length: 11 }, (_, r) => ({
          round: r + 1,
          opponentTeamName: 'Opp',
          opponentPairingNumber: 2,
          isHome: true,
          teamScore: 3,
          oppScore: 1,
          matchOutcome: 'win',
          matchPoints: 2,
          teamAvgElo: 1800,
          oppAvgElo: 1700,
        })),
        seasonAvgElo: 1800,
        seasonOppAvgElo: 1700,
      })),
    };

    const pairings = getDivisionPairings(4, 'A', 12);
    const completeRounds: RoundFrbe[] = pairings.map((roundMatchups, rIdx) => ({
      round: rIdx + 1,
      rdate: '2026-10-01',
      encounters: roundMatchups.map((m) => {
        const [h, a] = m.split('-').map(Number);
        return {
          icclub_home: 100 + h,
          icclub_visit: 100 + a,
          pairingnr_home: h,
          pairingnr_visit: a,
          matchpoint_home: 2,
          matchpoint_visit: 0,
          boardpoint2_home: 6,
          boardpoint2_visit: 2,
          games: [],
          played: true,
          signhome_idnumber: 0,
          signhome_ts: null,
          signvisit_idnumber: 0,
          signvisit_ts: null,
        };
      }),
    }));

    const completeDivision: DivisionFrbe = {
      division: 4,
      index: 'A',
      teams,
      rounds: completeRounds,
    };

    const projections = calculateDivisionProjections(completeDivision, standings, 500);

    expect(projections.isSeasonCompleted).toBe(true);
    expect(projections.remainingRounds).toBe(0);
    expect(projections.teams[0].championProbability).toBe(100);
    expect(projections.teams[0].promotionProbability).toBe(100);
    expect(projections.teams[0].isGuaranteedChampion).toBe(true);
    expect(projections.teams[0].expectedRank).toBe(1);
    expect(projections.teams[11].championProbability).toBe(0);
    expect(projections.teams[11].relegationProbability).toBe(100);
    expect(projections.teams[11].isGuaranteedRelegated).toBe(true);

    // Verify row sums in integer probabilities
    projections.teams.forEach((t) => {
      const sum = t.integerRankProbabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });
  });

  it('accurately projects active season and assigns favorite with guaranteed safe', () => {
    const teams: TeamFrbe[] = Array.from({ length: 12 }, (_, i) => ({
      division: 3,
      index: 'A',
      idclub: 200 + i,
      name: `Club ${i + 1}`,
      pairingnumber: i + 1,
      titular: [],
      playersplayed: [],
    }));

    const pairings = getDivisionPairings(3, 'A', 12);
    const partialRounds: RoundFrbe[] = pairings.slice(0, 5).map((roundMatchups, rIdx) => ({
      round: rIdx + 1,
      rdate: '2026-10-01',
      encounters: roundMatchups.map((m) => {
        const [h, a] = m.split('-').map(Number);
        return {
          icclub_home: 200 + h,
          icclub_visit: 200 + a,
          pairingnr_home: h,
          pairingnr_visit: a,
          matchpoint_home: h < a ? 2 : 0,
          matchpoint_visit: h < a ? 0 : 2,
          boardpoint2_home: h < a ? 8 : 4,
          boardpoint2_visit: h < a ? 4 : 8,
          games: [],
          played: true,
          signhome_idnumber: 0,
          signhome_ts: null,
          signvisit_idnumber: 0,
          signvisit_ts: null,
        };
      }),
    }));

    const activeDivision: DivisionFrbe = {
      division: 3,
      index: 'A',
      teams,
      rounds: partialRounds,
    };

    const standings: DivisionStandingTable = {
      division: 3,
      index: 'A',
      divisionLabel: 'Division 3A',
      teams: teams.map((t, idx) => {
        const rank = idx + 1;
        const mp = Math.max(0, 10 - idx);
        return {
          rank,
          clubId: t.idclub,
          teamName: t.name,
          pairingNumber: t.pairingnumber,
          played: 5,
          won: Math.floor(mp / 2),
          drawn: mp % 2,
          lost: 5 - Math.floor(mp / 2) - (mp % 2),
          matchPoints: mp,
          boardPoints: mp * 3,
          isOurClub: idx === 0,
          matchHistory: Array.from({ length: 5 }, (_, r) => ({
            round: r + 1,
            opponentTeamName: 'Opp',
            opponentPairingNumber: 2,
            isHome: true,
            teamScore: 4,
            oppScore: 2,
            matchOutcome: 'win',
            matchPoints: 2,
            teamAvgElo: 2100 - idx * 50,
            oppAvgElo: 1800,
          })),
          seasonAvgElo: 2100 - idx * 50,
          seasonOppAvgElo: 1800,
        };
      }),
    };

    const projections = calculateDivisionProjections(activeDivision, standings, 1500);

    expect(projections.isSeasonCompleted).toBe(false);
    expect(projections.remainingRounds).toBe(6);
    expect(projections.favoriteTeam).toBeDefined();
    expect(projections.favoriteTeam?.teamName).toBe('Club 1');
    expect(projections.favoriteTeam?.isFavorite).toBe(true);
    expect(projections.favoriteTeam?.promotionProbability).toBeGreaterThan(30);
    expect(projections.favoriteTeam?.safeProbability).toBeGreaterThan(90);

    // Each row of integer probabilities must sum to exactly 100
    projections.teams.forEach((t) => {
      const sum = t.integerRankProbabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });
  });
});
