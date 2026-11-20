import { DivisionFrbe } from '../modelsFRBE';
import { PAIRINGS_12, PAIRINGS_10, PAIRINGS_6J } from '../season';
import { DivisionStandingTable } from './standings';
import { getBoardCountForDivision } from './scouting';

export interface TeamProjection {
  rank: number; // Current rank
  teamName: string;
  pairingNumber: number;
  clubId: number;
  isOurClub: boolean;
  played: number;
  remaining: number;
  matchPoints: number;
  boardPoints: number;
  seasonAvgElo: number;

  // Probabilities (0 to 100, formatted to 1 decimal place)
  rankProbabilities: number[]; // Array of size totalTeams: index 0 = prob of 1st, index 1 = prob of 2nd, etc.
  expectedRank: number; // Weighted average rank (e.g. 2.4)
  championProbability: number; // Prob of finishing 1st (%)
  top2Probability: number; // Prob of finishing top 2 (%) - promotion
  top3Probability: number; // Prob of finishing top 3 (%) - podium
  top8Probability: number; // Prob of finishing top 8 (%) - maintien
  relegationProbability: number; // Prob of finishing in relegation zone (%)

  // Mathematical bounds & certainty flags
  minPossibleRank: number; // Best possible rank mathematically (1 being highest)
  maxPossibleRank: number; // Worst possible rank mathematically
  isFavorite: boolean; // Highest probability to finish 1st
  isGuaranteedChampion: boolean; // Mathematically cannot finish worse than 1st
  isGuaranteedTop2: boolean; // Mathematically cannot finish worse than 2nd
  isGuaranteedTop3: boolean; // Mathematically cannot finish worse than 3rd
  isGuaranteedTop8: boolean; // Mathematically cannot finish worse than 8th ("Maintien assuré")
  isGuaranteedRelegated: boolean; // Mathematically cannot finish 8th or higher
}

export interface DivisionProjections {
  division: number;
  index: string;
  divisionLabel: string;
  boardCount: number;
  totalTeams: number;
  totalRounds: number;
  playedRounds: number;
  remainingRounds: number;
  isSeasonCompleted: boolean;
  relegationRankThreshold: number; // 8 for 12-team leagues (ranks 9-12 relegate), 8 for 10-team leagues (9-10 relegate)
  simulationsCount: number;
  favoriteTeam?: TeamProjection;
  ourTeam?: TeamProjection;
  teams: TeamProjection[]; // Sorted by current rank
}

export interface UnplayedMatch {
  round: number;
  homePairingNr: number;
  awayPairingNr: number;
}

/**
 * Returns the official schedule pairing matrix according to division type
 */
export function getDivisionPairings(division: number, index: string, teamCount: number): string[][] {
  if (division === 6) {
    if (index === 'J') return PAIRINGS_6J;
    if (teamCount <= 10) return PAIRINGS_10;
  }
  return teamCount <= 10 ? PAIRINGS_10 : PAIRINGS_12;
}

/**
 * Calculates win/draw/loss probabilities for an encounter between two teams based on Elo
 */
export function calculateMatchBoardProbabilities(
  homeElo: number,
  awayElo: number
): { pWin: number; pDraw: number; pLoss: number } {
  // If ratings are unknown, assume equal strength
  const rHome = homeElo > 0 ? homeElo : 1500;
  const rAway = awayElo > 0 ? awayElo : 1500;
  const deltaElo = rHome - rAway;

  // Expected score per board according to standard Elo logistic curve
  const expected = 1 / (1 + Math.pow(10, -deltaElo / 400));

  // In amateur/club chess, draw rate is ~25-35% between equal ratings, decreasing with rating gap
  const baseDrawRate = 0.28;
  const pDraw = Math.max(0.08, Math.min(0.38, baseDrawRate * (1 - Math.abs(2 * expected - 1))));

  let pWin = expected - 0.5 * pDraw;
  let pLoss = (1 - expected) - 0.5 * pDraw;

  if (pWin < 0) {
    pLoss += pWin;
    pWin = 0;
  }
  if (pLoss < 0) {
    pWin += pLoss;
    pLoss = 0;
  }

  // Normalize to guarantee sum = 1
  const sum = pWin + pDraw + pLoss;
  return {
    pWin: pWin / sum,
    pDraw: pDraw / sum,
    pLoss: pLoss / sum,
  };
}

/**
 * Extracts all remaining unplayed encounters for a division based on official pairings schedule
 */
export function extractRemainingMatches(
  division: DivisionFrbe,
  teamCount: number
): UnplayedMatch[] {
  const pairings = getDivisionPairings(division.division, division.index, teamCount);
  const remainingMatches: UnplayedMatch[] = [];

  const validPairingNrs = new Set(division.teams.map((t) => t.pairingnumber));

  for (let rIndex = 0; rIndex < pairings.length; rIndex++) {
    const roundNumber = rIndex + 1;
    const matchups = pairings[rIndex];
    const existingRound = division.rounds.find((rd) => rd.round === roundNumber);

    for (const matchStr of matchups) {
      const [hStr, aStr] = matchStr.split('-');
      const homeNr = parseInt(hStr, 10);
      const awayNr = parseInt(aStr, 10);

      // Skip byes / unregistered teams
      if (!validPairingNrs.has(homeNr) || !validPairingNrs.has(awayNr)) {
        continue;
      }

      // Check if already played in division.rounds
      const existingEnc = existingRound?.encounters.find(
        (e) =>
          (e.pairingnr_home === homeNr && e.pairingnr_visit === awayNr) ||
          (e.pairingnr_home === awayNr && e.pairingnr_visit === homeNr)
      );

      if (!existingEnc || !existingEnc.played) {
        remainingMatches.push({
          round: roundNumber,
          homePairingNr: homeNr,
          awayPairingNr: awayNr,
        });
      }
    }
  }

  return remainingMatches;
}

/**
 * Computes strict mathematical min and max possible finishing ranks for each team
 */
export function calculateMathematicalRankBounds(
  standings: DivisionStandingTable,
  remainingMatches: UnplayedMatch[]
): Map<number, { minRank: number; maxRank: number }> {
  const remainingCountMap = new Map<number, number>();
  standings.teams.forEach((t) => remainingCountMap.set(t.pairingNumber, 0));

  remainingMatches.forEach((m) => {
    remainingCountMap.set(m.homePairingNr, (remainingCountMap.get(m.homePairingNr) || 0) + 1);
    remainingCountMap.set(m.awayPairingNr, (remainingCountMap.get(m.awayPairingNr) || 0) + 1);
  });

  const maxPointsMap = new Map<number, number>();
  const minPointsMap = new Map<number, number>();

  standings.teams.forEach((t) => {
    const rem = remainingCountMap.get(t.pairingNumber) || 0;
    maxPointsMap.set(t.pairingNumber, t.matchPoints + rem * 2);
    minPointsMap.set(t.pairingNumber, t.matchPoints);
  });

  const boundsMap = new Map<number, { minRank: number; maxRank: number }>();
  const totalTeams = standings.teams.length;

  standings.teams.forEach((team) => {
    const myMax = maxPointsMap.get(team.pairingNumber) || 0;
    const myMin = minPointsMap.get(team.pairingNumber) || 0;

    // Minimum possible rank (best rank): how many teams have strictly more min points than my max points?
    // In the best case for team, team achieves myMax points, and rival achieves their min points.
    // If rival's min > team's max, rival is guaranteed ahead.
    let guaranteedAhead = 0;
    // In the worst case for team, team achieves myMin points, and rivals achieve their max points.
    // How many rivals could potentially finish ahead or tied?
    let potentialAheadOrTied = 0;

    standings.teams.forEach((other) => {
      if (other.pairingNumber === team.pairingNumber) return;
      const otherMin = minPointsMap.get(other.pairingNumber) || 0;
      const otherMax = maxPointsMap.get(other.pairingNumber) || 0;

      if (otherMin > myMax) {
        guaranteedAhead++;
      }
      if (otherMax >= myMin) {
        potentialAheadOrTied++;
      }
    });

    const minRank = 1 + guaranteedAhead;
    const maxRank = Math.min(totalTeams, 1 + potentialAheadOrTied);

    boundsMap.set(team.pairingNumber, { minRank, maxRank });
  });

  return boundsMap;
}

/**
 * Runs a Monte Carlo simulation on remaining encounters to project final standings probabilities
 */
export function calculateDivisionProjections(
  division: DivisionFrbe,
  standings: DivisionStandingTable,
  simulationsCount = 2500
): DivisionProjections {
  const totalTeams = standings.teams.length;
  const boardCount = getBoardCountForDivision(division.division);
  const pairings = getDivisionPairings(division.division, division.index, totalTeams);
  const totalRounds = pairings.length;
  const remainingMatches = extractRemainingMatches(division, totalTeams);
  const playedRounds = Math.max(0, ...standings.teams.flatMap((t) => t.matchHistory.map((m) => m.round)));
  const remainingRounds = Math.max(0, totalRounds - playedRounds);
  const isSeasonCompleted = remainingMatches.length === 0;

  // Relegation threshold: ranks > threshold are in relegation zone (usually top 8 safe)
  const relegationRankThreshold = totalTeams <= 10 ? 8 : 8;

  const boundsMap = calculateMathematicalRankBounds(standings, remainingMatches);

  // If season is completed, every team's rank is fixed with 100% certainty
  if (isSeasonCompleted) {
    const projections: TeamProjection[] = standings.teams.map((t) => {
      const rankProbs = new Array(totalTeams).fill(0);
      rankProbs[t.rank - 1] = 100;

      const isTop8 = t.rank <= relegationRankThreshold;

      return {
        rank: t.rank,
        teamName: t.teamName,
        pairingNumber: t.pairingNumber,
        clubId: t.clubId,
        isOurClub: t.isOurClub,
        played: t.played,
        remaining: 0,
        matchPoints: t.matchPoints,
        boardPoints: t.boardPoints,
        seasonAvgElo: t.seasonAvgElo,
        rankProbabilities: rankProbs,
        expectedRank: t.rank,
        championProbability: t.rank === 1 ? 100 : 0,
        top2Probability: t.rank <= 2 ? 100 : 0,
        top3Probability: t.rank <= 3 ? 100 : 0,
        top8Probability: isTop8 ? 100 : 0,
        relegationProbability: isTop8 ? 0 : 100,
        minPossibleRank: t.rank,
        maxPossibleRank: t.rank,
        isFavorite: t.rank === 1,
        isGuaranteedChampion: t.rank === 1,
        isGuaranteedTop2: t.rank <= 2,
        isGuaranteedTop3: t.rank <= 3,
        isGuaranteedTop8: isTop8,
        isGuaranteedRelegated: !isTop8,
      };
    });

    const favoriteTeam = projections.find((p) => p.isFavorite);
    const ourTeam = projections.find((p) => p.isOurClub);

    return {
      division: division.division,
      index: division.index,
      divisionLabel: standings.divisionLabel,
      boardCount,
      totalTeams,
      totalRounds,
      playedRounds,
      remainingRounds: 0,
      isSeasonCompleted: true,
      relegationRankThreshold,
      simulationsCount: 0,
      favoriteTeam,
      ourTeam,
      teams: projections,
    };
  }

  // Precompute team ratings and lookup maps
  const teamIndexMap = new Map<number, number>();
  const teamElos: number[] = [];
  const baseMatchPoints: number[] = [];
  const baseBoardPoints: number[] = [];

  standings.teams.forEach((t, idx) => {
    teamIndexMap.set(t.pairingNumber, idx);
    teamElos.push(t.seasonAvgElo || 1500);
    baseMatchPoints.push(t.matchPoints);
    baseBoardPoints.push(t.boardPoints);
  });

  // Precalculate matchup probabilities for each unplayed encounter
  const preparedMatches = remainingMatches.map((m) => {
    const hIdx = teamIndexMap.get(m.homePairingNr)!;
    const aIdx = teamIndexMap.get(m.awayPairingNr)!;
    const probs = calculateMatchBoardProbabilities(teamElos[hIdx], teamElos[aIdx]);
    return {
      hIdx,
      aIdx,
      pWin: probs.pWin,
      pDraw: probs.pDraw,
      pLoss: probs.pLoss,
    };
  });

  // Monte Carlo simulation state
  // rankCounts[teamIndex][rank - 1]
  const rankCounts: number[][] = Array.from({ length: totalTeams }, () =>
    new Array(totalTeams).fill(0)
  );

  const curMatchPoints = new Float64Array(totalTeams);
  const curBoardPoints = new Float64Array(totalTeams);
  const indices = Array.from({ length: totalTeams }, (_, i) => i);

  for (let sim = 0; sim < simulationsCount; sim++) {
    // Reset starting points
    for (let i = 0; i < totalTeams; i++) {
      curMatchPoints[i] = baseMatchPoints[i];
      curBoardPoints[i] = baseBoardPoints[i];
    }

    // Simulate remaining matches board-by-board
    for (let m = 0; m < preparedMatches.length; m++) {
      const match = preparedMatches[m];
      let homeScore = 0;

      for (let b = 0; b < boardCount; b++) {
        const rand = Math.random();
        if (rand < match.pWin) {
          homeScore += 1;
        } else if (rand < match.pWin + match.pDraw) {
          homeScore += 0.5;
        }
      }

      const awayScore = boardCount - homeScore;
      curBoardPoints[match.hIdx] += homeScore;
      curBoardPoints[match.aIdx] += awayScore;

      if (homeScore > awayScore) {
        curMatchPoints[match.hIdx] += 2;
      } else if (homeScore === awayScore) {
        curMatchPoints[match.hIdx] += 1;
        curMatchPoints[match.aIdx] += 1;
      } else {
        curMatchPoints[match.aIdx] += 2;
      }
    }

    // Sort teams by match points (desc), then board points (desc)
    indices.sort((a, b) => {
      const diffMp = curMatchPoints[b] - curMatchPoints[a];
      if (diffMp !== 0) return diffMp;
      return curBoardPoints[b] - curBoardPoints[a];
    });

    // Record finishing rank for this iteration
    for (let r = 0; r < totalTeams; r++) {
      const teamIdx = indices[r];
      rankCounts[teamIdx][r]++;
    }
  }

  // Count remaining matches per team
  const remainingCountMap = new Map<number, number>();
  standings.teams.forEach((t) => remainingCountMap.set(t.pairingNumber, 0));
  remainingMatches.forEach((m) => {
    remainingCountMap.set(m.homePairingNr, (remainingCountMap.get(m.homePairingNr) || 0) + 1);
    remainingCountMap.set(m.awayPairingNr, (remainingCountMap.get(m.awayPairingNr) || 0) + 1);
  });

  // Assemble final projections
  const projections: TeamProjection[] = standings.teams.map((team, idx) => {
    const counts = rankCounts[idx];
    const rankProbs = counts.map((c) => Math.round((c / simulationsCount) * 1000) / 10);

    let expectedRankSum = 0;
    for (let r = 0; r < totalTeams; r++) {
      expectedRankSum += (r + 1) * counts[r];
    }
    const expectedRank = Math.round((expectedRankSum / simulationsCount) * 10) / 10;

    const championProbability = rankProbs[0] || 0;
    const top2Probability = Math.round(((rankProbs[0] || 0) + (rankProbs[1] || 0)) * 10) / 10;
    const top3Probability =
      Math.round(((rankProbs[0] || 0) + (rankProbs[1] || 0) + (rankProbs[2] || 0)) * 10) / 10;

    let top8Sum = 0;
    for (let r = 0; r < Math.min(relegationRankThreshold, totalTeams); r++) {
      top8Sum += rankProbs[r] || 0;
    }
    const top8Probability = Math.min(100, Math.round(top8Sum * 10) / 10);
    const relegationProbability = Math.max(0, Math.round((100 - top8Probability) * 10) / 10);

    const bounds = boundsMap.get(team.pairingNumber) || { minRank: 1, maxRank: totalTeams };

    // Find observed simulation bounds
    let simBestRank = 1;
    for (let r = 0; r < totalTeams; r++) {
      if (counts[r] > 0) {
        simBestRank = r + 1;
        break;
      }
    }
    let simWorstRank = totalTeams;
    for (let r = totalTeams - 1; r >= 0; r--) {
      if (counts[r] > 0) {
        simWorstRank = r + 1;
        break;
      }
    }

    const minPossibleRank = Math.max(bounds.minRank, simBestRank);
    const maxPossibleRank = Math.min(bounds.maxRank, simWorstRank);

    const isGuaranteedChampion = bounds.maxRank === 1;
    const isGuaranteedTop2 = bounds.maxRank <= 2;
    const isGuaranteedTop3 = bounds.maxRank <= 3;
    const isGuaranteedTop8 = bounds.maxRank <= relegationRankThreshold;
    const isGuaranteedRelegated = bounds.minRank > relegationRankThreshold;

    return {
      rank: team.rank,
      teamName: team.teamName,
      pairingNumber: team.pairingNumber,
      clubId: team.clubId,
      isOurClub: team.isOurClub,
      played: team.played,
      remaining: remainingCountMap.get(team.pairingNumber) || 0,
      matchPoints: team.matchPoints,
      boardPoints: team.boardPoints,
      seasonAvgElo: team.seasonAvgElo,
      rankProbabilities: rankProbs,
      expectedRank,
      championProbability,
      top2Probability,
      top3Probability,
      top8Probability,
      relegationProbability,
      minPossibleRank,
      maxPossibleRank,
      isFavorite: false, // will mark after sorting
      isGuaranteedChampion,
      isGuaranteedTop2,
      isGuaranteedTop3,
      isGuaranteedTop8,
      isGuaranteedRelegated,
    };
  });

  // Determine favorite (highest champion probability)
  let maxChampProb = -1;
  let favoriteIdx = -1;
  projections.forEach((p, idx) => {
    if (p.championProbability > maxChampProb) {
      maxChampProb = p.championProbability;
      favoriteIdx = idx;
    }
  });

  if (favoriteIdx >= 0 && maxChampProb > 0) {
    projections[favoriteIdx].isFavorite = true;
  }

  const favoriteTeam = projections.find((p) => p.isFavorite);
  const ourTeam = projections.find((p) => p.isOurClub);

  return {
    division: division.division,
    index: division.index,
    divisionLabel: standings.divisionLabel,
    boardCount,
    totalTeams,
    totalRounds,
    playedRounds,
    remainingRounds,
    isSeasonCompleted: false,
    relegationRankThreshold,
    simulationsCount,
    favoriteTeam,
    ourTeam,
    teams: projections,
  };
}
