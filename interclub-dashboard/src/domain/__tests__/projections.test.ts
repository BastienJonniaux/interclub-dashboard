import { describe, it, expect } from 'vitest';
import {
  calculateMatchBoardProbabilities,
  extractRemainingMatches,
  calculateMathematicalRankBounds,
  calculateDivisionProjections,
  getDivisionPairings,
} from '../projections';
import { DivisionFrbe, TeamFrbe, RoundFrbe } from '../../modelsFRBE';
import { DivisionStandingTable, TeamStanding } from '../standings';

describe('Projections Domain - calculateMatchBoardProbabilities', () => {
  it('gives symmetric probabilities when ratings are equal', () => {
    const probs = calculateMatchBoardProbabilities(1800, 1800);
    expect(probs.pWin).toBeCloseTo(probs.pLoss, 3);
    expect(probs.pWin + probs.pDraw + probs.pLoss).toBeCloseTo(1, 4);
    expect(probs.pDraw).toBeGreaterThan(0.2);
  });

  it('favors higher-rated team when Elo difference is positive', () => {
    const probs = calculateMatchBoardProbabilities(2000, 1600); // +400 Elo
    expect(probs.pWin).toBeGreaterThan(0.7);
    expect(probs.pLoss).toBeLessThan(0.15);
    expect(probs.pWin + probs.pDraw + probs.pLoss).toBeCloseTo(1, 4);
  });

  it('favors opponent when Elo difference is negative', () => {
    const probs = calculateMatchBoardProbabilities(1500, 1900); // -400 Elo
    expect(probs.pLoss).toBeGreaterThan(0.7);
    expect(probs.pWin).toBeLessThan(0.15);
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

    // Round 1 pairings in PAIRINGS_12: ['1-12', '2-11', '3-10', '4-9', '5-8', '6-7']
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
    expect(remaining).toHaveLength(65); // 66 - 1 = 65
    const has1vs12 = remaining.some(
      (m) => m.round === 1 && m.homePairingNr === 1 && m.awayPairingNr === 12
    );
    expect(has1vs12).toBe(false);
  });
});

describe('Projections Domain - calculateMathematicalRankBounds', () => {
  it('identifies guaranteed champion when lead is insurmountable', () => {
    // 12 teams, team 1 has 18 match points with 1 match remaining (max points 20)
    // 2nd place has 14 points with 1 match remaining (max points 16)
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

    // Add remaining 10 teams with 10 or fewer points
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

    // 1 match remaining for team 1 and 2
    const remainingMatches = [
      { round: 11, homePairingNr: 1, awayPairingNr: 2 },
    ];

    const bounds = calculateMathematicalRankBounds(standings, remainingMatches);
    const leaderBounds = bounds.get(1);

    expect(leaderBounds).toBeDefined();
    expect(leaderBounds?.minRank).toBe(1);
    expect(leaderBounds?.maxRank).toBe(1); // Guaranteed 1st!
  });

  it('identifies guaranteed Top 8 (maintien assuré) when safe from 9th place', () => {
    // Team has 14 points, with 2 matches left (min 14 pts).
    // Teams ranked 9-12 have at most 6 points with 2 matches left (max 10 pts).
    // Can team ever fall into ranks 9-12? No!
    const teams: TeamStanding[] = Array.from({ length: 12 }, (_, i) => {
      const rank = i + 1;
      let mp = 14;
      if (rank === 1) mp = 16;
      else if (rank <= 6) mp = 14;
      else if (rank <= 8) mp = 10;
      else mp = 4; // ranks 9-12 have 4 points

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

    // 2 matches remaining per team
    const remainingMatches = [
      { round: 10, homePairingNr: 1, awayPairingNr: 2 },
      { round: 10, homePairingNr: 3, awayPairingNr: 4 },
      { round: 10, homePairingNr: 9, awayPairingNr: 10 },
      { round: 10, homePairingNr: 11, awayPairingNr: 12 },
      { round: 11, homePairingNr: 4, awayPairingNr: 1 },
      { round: 11, homePairingNr: 9, awayPairingNr: 11 },
    ];

    const bounds = calculateMathematicalRankBounds(standings, remainingMatches);
    const team4Bounds = bounds.get(4);

    expect(team4Bounds).toBeDefined();
    expect(team4Bounds?.maxRank).toBeLessThanOrEqual(8); // Mathematically impossible to drop to 9th!
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

    // For complete season, create division with all 66 encounters marked played
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
    expect(projections.teams[0].isGuaranteedChampion).toBe(true);
    expect(projections.teams[0].expectedRank).toBe(1);
    expect(projections.teams[11].championProbability).toBe(0);
    expect(projections.teams[11].relegationProbability).toBe(100);
    expect(projections.teams[11].isGuaranteedRelegated).toBe(true);
  });

  it('accurately projects active season and assigns favorite with guaranteed top 8', () => {
    const teams: TeamFrbe[] = Array.from({ length: 12 }, (_, i) => ({
      division: 3,
      index: 'A',
      idclub: 200 + i,
      name: `Club ${i + 1}`,
      pairingnumber: i + 1,
      titular: [],
      playersplayed: [],
    }));

    // Round 1-5 played, Round 6-11 unplayed
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

    // Team 1 is dominating: 10 match points, 2200 avg Elo
    // Team 12 is struggling: 0 match points, 1500 avg Elo
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
    expect(projections.favoriteTeam?.championProbability).toBeGreaterThan(40);
    expect(projections.favoriteTeam?.top8Probability).toBeGreaterThan(95);

    // Bottom team has low champion probability and high relegation probability
    const bottomTeam = projections.teams[11];
    expect(bottomTeam.championProbability).toBeLessThan(5);
    expect(bottomTeam.relegationProbability).toBeGreaterThan(50);
  });
});
