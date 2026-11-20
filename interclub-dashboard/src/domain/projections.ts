import { DivisionFrbe } from '../modelsFRBE';
import { PAIRINGS_12, PAIRINGS_10, PAIRINGS_6J } from '../season';
import { DivisionStandingTable } from './standings';
import { getBoardCountForDivision } from './scouting';

export interface DivisionRulesConfig {
  promotionSpots: number; // 0 for Div 1, 1 for Div 2-4, 2 for Div 5, 1 for Div 6
  relegationSpots: number; // 2 for Div 1-5, 0 for Div 6
  hasTitle: boolean; // true for Div 1 (Champion de Belgique)
  safeRankMax: number; // 10 for Div 1-5 (ranks 1..10 safe, 11-12 relegate), totalTeams for Div 6
  promotionLabel: string; // 'Titre' for Div 1, 'Montée (1er)' for Div 2-4,6, 'Montée (Top 2)' for Div 5
}

/**
 * Official Belgian Interclubs promotion and relegation rules per division:
 * - Division I (12 teams): — (no promotion), 2 relegations (11th and 12th)
 * - Division II (12 teams): 1 promotion (champion), 2 relegations (11th and 12th)
 * - Division III (12 teams): 1 promotion (champion), 2 relegations (11th and 12th)
 * - Division IV (12 teams): 1 promotion (champion), 2 relegations (11th and 12th)
 * - Division V (12 teams): 2 promotions (1st and 2nd), 2 relegations (11th and 12th)
 * - Division VI (max 10 teams): 1 promotion (champion), 0 relegations
 */
export function getDivisionRules(division: number, totalTeams: number): DivisionRulesConfig {
  switch (division) {
    case 1:
      return {
        promotionSpots: 0,
        relegationSpots: 2,
        hasTitle: true,
        safeRankMax: Math.min(10, totalTeams - 2),
        promotionLabel: 'Champion',
      };
    case 2:
    case 3:
    case 4:
      return {
        promotionSpots: 1,
        relegationSpots: 2,
        hasTitle: false,
        safeRankMax: Math.min(10, totalTeams - 2),
        promotionLabel: 'Montée (1er)',
      };
    case 5:
      return {
        promotionSpots: 2,
        relegationSpots: 2,
        hasTitle: false,
        safeRankMax: Math.min(10, totalTeams - 2),
        promotionLabel: 'Montée (Top 2)',
      };
    case 6:
      return {
        promotionSpots: 1,
        relegationSpots: 0,
        hasTitle: false,
        safeRankMax: totalTeams,
        promotionLabel: 'Montée (1er)',
      };
    default:
      return {
        promotionSpots: 1,
        relegationSpots: 2,
        hasTitle: false,
        safeRankMax: Math.min(10, totalTeams - 2),
        promotionLabel: 'Montée',
      };
  }
}

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

  // Exact rounded integer percentages for the distribution grid (sums to 100% exactly)
  integerRankProbabilities: number[];
  // Decimal percentages for detailed hover cards (0 to 100, 1 decimal)
  rankProbabilities: number[];

  expectedRank: number; // Weighted average rank (1 decimal, e.g. 1.0, 2.1)
  championProbability: number; // Prob of finishing 1st (%)
  promotionProbability: number; // Prob of achieving promotion / title (%)
  safeProbability: number; // Prob of securing safety / maintien (%)
  relegationProbability: number; // Prob of finishing in relegation zone (%)

  // Mathematical bounds & certainty flags
  minPossibleRank: number; // Best possible rank mathematically (1 being highest)
  maxPossibleRank: number; // Worst possible rank mathematically
  isFavorite: boolean; // Highest probability to finish in promotion/champion spot
  isGuaranteedChampion: boolean; // Mathematically cannot finish worse than 1st
  isGuaranteedPromotion: boolean; // Mathematically cannot finish outside promotion spots
  isGuaranteedSafe: boolean; // Mathematically cannot finish in relegation zone ("Maintien assuré")
  isGuaranteedRelegated: boolean; // Mathematically cannot finish in safe zone
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
  rules: DivisionRulesConfig;
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
 * Distributes integer percentages so the row sum equals exactly 100%
 * using the Largest Remainder Method (Hamilton-Hare method).
 */
export function distributeIntegerPercentages(rawPercentages: number[]): number[] {
  const n = rawPercentages.length;
  if (n === 0) return [];

  const sumRaw = rawPercentages.reduce((a, b) => a + b, 0);
  if (sumRaw <= 0) {
    const res = new Array(n).fill(0);
    res[0] = 100;
    return res;
  }

  // Normalize to 100 in case sum is slightly off due to float arithmetic
  const normalized = rawPercentages.map((p) => (p / sumRaw) * 100);
  const floors = normalized.map((p) => Math.floor(p));
  const remainders = normalized.map((p, idx) => ({ remainder: p - floors[idx], idx }));

  let currentSum = floors.reduce((a, b) => a + b, 0);
  const diff = 100 - currentSum;

  if (diff > 0) {
    remainders.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < diff && i < n; i++) {
      floors[remainders[i].idx]++;
    }
  }

  return floors;
}

/**
 * Calculates win/draw/loss probabilities for an encounter between two teams based on Elo.
 * Calibrated for Belgian amateur/club interclubs:
 * - Uses D = 480 logistic scaling (accounts for board Elo dispersion).
 * - Calibrated draw rate (22% to 32% depending on rating gap).
 */
export function calculateMatchBoardProbabilities(
  homeElo: number,
  awayElo: number
): { pWin: number; pDraw: number; pLoss: number } {
  const rHome = homeElo > 0 ? homeElo : 1500;
  const rAway = awayElo > 0 ? awayElo : 1500;
  const deltaElo = rHome - rAway;

  // D = 480 provides a realistic curve for amateur interclub matches
  const expected = 1 / (1 + Math.pow(10, -deltaElo / 480));

  const baseDrawRate = 0.30;
  const pDraw = Math.max(0.12, Math.min(0.34, baseDrawRate * (1 - Math.abs(2 * expected - 1))));

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

    let guaranteedAhead = 0;
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

  // Retrieve official promotion / relegation rules for this division
  const rules = getDivisionRules(division.division, totalTeams);
  const boundsMap = calculateMathematicalRankBounds(standings, remainingMatches);

  // If season is completed, every team's rank is fixed with 100% certainty
  if (isSeasonCompleted) {
    const projections: TeamProjection[] = standings.teams.map((t) => {
      const rawProbs = new Array(totalTeams).fill(0);
      rawProbs[t.rank - 1] = 100;

      const isPromotion =
        rules.promotionSpots > 0 ? t.rank <= rules.promotionSpots : t.rank === 1;
      const isSafe = t.rank <= rules.safeRankMax;

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
        integerRankProbabilities: [...rawProbs],
        rankProbabilities: rawProbs.map((p) => Math.round(p * 10) / 10),
        expectedRank: t.rank,
        championProbability: t.rank === 1 ? 100 : 0,
        promotionProbability: isPromotion ? 100 : 0,
        safeProbability: isSafe ? 100 : 0,
        relegationProbability: isSafe ? 0 : 100,
        minPossibleRank: t.rank,
        maxPossibleRank: t.rank,
        isFavorite: t.rank === 1,
        isGuaranteedChampion: t.rank === 1,
        isGuaranteedPromotion: isPromotion,
        isGuaranteedSafe: isSafe,
        isGuaranteedRelegated: !isSafe,
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
      rules,
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

  // Precalculate matchup base indices
  const unplayedEncounters = remainingMatches.map((m) => ({
    hIdx: teamIndexMap.get(m.homePairingNr)!,
    aIdx: teamIndexMap.get(m.awayPairingNr)!,
  }));

  // Monte Carlo simulation state
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

    // Round-to-round team form noise (simulates lineup rotation, absences, board order shifts)
    // +/- 35 Elo per team per simulation run
    const simElos = new Float64Array(totalTeams);
    for (let i = 0; i < totalTeams; i++) {
      simElos[i] = teamElos[i] + (Math.random() - 0.5) * 70;
    }

    // Simulate remaining matches board-by-board
    for (let m = 0; m < unplayedEncounters.length; m++) {
      const match = unplayedEncounters[m];
      const probs = calculateMatchBoardProbabilities(simElos[match.hIdx], simElos[match.aIdx]);

      let homeScore = 0;
      for (let b = 0; b < boardCount; b++) {
        const rand = Math.random();
        if (rand < probs.pWin) {
          homeScore += 1;
        } else if (rand < probs.pWin + probs.pDraw) {
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
    const rawProbs = counts.map((c) => (c / simulationsCount) * 100);

    // Distribute integers so row sum is exactly 100%
    const integerRankProbabilities = distributeIntegerPercentages(rawProbs);
    const rankProbabilities = rawProbs.map((p) => Math.round(p * 10) / 10);

    let expectedRankSum = 0;
    for (let r = 0; r < totalTeams; r++) {
      expectedRankSum += (r + 1) * counts[r];
    }
    const expectedRank = Math.round((expectedRankSum / simulationsCount) * 10) / 10;

    const championProbability = rankProbabilities[0] || 0;

    // Promotion probability:
    // In Div 1: title (rank 1)
    // In Div 2-4, 6: rank 1
    // In Div 5: ranks 1 and 2
    let promoSum = 0;
    const promoRanks = rules.promotionSpots > 0 ? rules.promotionSpots : 1;
    for (let r = 0; r < promoRanks && r < totalTeams; r++) {
      promoSum += rawProbs[r] || 0;
    }
    const promotionProbability = Math.min(100, Math.round(promoSum * 10) / 10);

    // Safety (Maintien) probability: ranks 1..safeRankMax
    let safeSum = 0;
    for (let r = 0; r < rules.safeRankMax && r < totalTeams; r++) {
      safeSum += rawProbs[r] || 0;
    }
    const safeProbability =
      rules.relegationSpots === 0 ? 100 : Math.min(100, Math.round(safeSum * 10) / 10);
    const relegationProbability =
      rules.relegationSpots === 0 ? 0 : Math.max(0, Math.round((100 - safeProbability) * 10) / 10);

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
    const isGuaranteedPromotion =
      rules.promotionSpots > 0
        ? bounds.maxRank <= rules.promotionSpots
        : bounds.maxRank === 1;
    const isGuaranteedSafe =
      rules.relegationSpots === 0 ? true : bounds.maxRank <= rules.safeRankMax;
    const isGuaranteedRelegated =
      rules.relegationSpots > 0 && bounds.minRank > rules.safeRankMax;

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
      integerRankProbabilities,
      rankProbabilities,
      expectedRank,
      championProbability,
      promotionProbability,
      safeProbability,
      relegationProbability,
      minPossibleRank,
      maxPossibleRank,
      isFavorite: false, // will mark after evaluating leaders
      isGuaranteedChampion,
      isGuaranteedPromotion,
      isGuaranteedSafe,
      isGuaranteedRelegated,
    };
  });

  // Determine favorite (highest promotion/champion probability)
  let maxPromoProb = -1;
  let favoriteIdx = -1;
  projections.forEach((p, idx) => {
    if (p.promotionProbability > maxPromoProb) {
      maxPromoProb = p.promotionProbability;
      favoriteIdx = idx;
    }
  });

  if (favoriteIdx >= 0 && maxPromoProb > 0) {
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
    rules,
    simulationsCount,
    favoriteTeam,
    ourTeam,
    teams: projections,
  };
}
