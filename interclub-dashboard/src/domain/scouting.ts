import { DivisionFrbe } from '../modelsFRBE';
import { PAIRINGS_12, PAIRINGS_10, PAIRINGS_6J } from '../season';

export type ReadinessColor = 'green' | 'yellow' | 'red';

export interface BoardScout {
  board: number;
  averageBoardElo: number;
  isRotation: boolean;
  frequentPlayer?: {
    name: string;
    id: number;
    rating: number;
    timesPlayed: number;
    percentage: number;
  };
  playersSeen: {
    id: number;
    name: string;
    rating: number;
    count: number;
  }[];
}

export interface NextMatchScout {
  ourTeamName: string;
  divisionLabel: string;
  roundNumber: number;
  roundDate?: string;
  isHome: boolean;
  opponentClubId: number;
  opponentTeamName: string;
  opponentAverageElo: number;
  ourAverageElo: number;
  eloDiff: number;
  readiness: ReadinessColor;
  readinessReason: string;
  boardsScouting: BoardScout[];
  boardCount: number;
  pastRoundsCount: number;
}

/**
 * Official Belgian Interclub board counts:
 * - Division 1 & 2: 8 boards
 * - Division 3: 6 boards
 * - Division 4, 5 & 6: 4 boards
 */
export function getBoardCountForDivision(divisionNumber: number): number {
  if (divisionNumber <= 2) return 8;
  if (divisionNumber === 3) return 6;
  return 4;
}

/**
 * Find the next match for our team in a division and analyze the opponent
 */
export function scoutNextMatch(
  division: DivisionFrbe,
  ourClubId: number,
  allDivisionsAcrossRounds: { round: number; divisions: DivisionFrbe[] }[],
  playerDirectory?: Map<number, { name: string; rating: number; clubName?: string }>,
  ourTeamAverageElo?: number
): NextMatchScout | null {
  const ourTeam = division.teams.find((t) => t.idclub === ourClubId);
  if (!ourTeam) return null;

  const boardCount = getBoardCountForDivision(division.division);
  const pairings =
    division.division === 6
      ? division.index === 'J'
        ? PAIRINGS_6J
        : PAIRINGS_10
      : PAIRINGS_12;

  // Find next unplayed round
  let nextRoundNumber = 1;
  for (let r = 1; r <= pairings.length; r++) {
    const roundData = division.rounds.find((rd) => rd.round === r);
    const encounter = roundData?.encounters.find(
      (e) => e.pairingnr_home === ourTeam.pairingnumber || e.pairingnr_visit === ourTeam.pairingnumber
    );
    if (!encounter || !encounter.played) {
      nextRoundNumber = r;
      break;
    }
  }

  // Find opponent pairing number from schedule
  const roundMatchups = pairings[nextRoundNumber - 1] || [];
  let opponentPairingNr: number | null = null;
  let isHome = true;

  for (const matchup of roundMatchups) {
    const [homeNr, awayNr] = matchup.split('-').map(Number);
    if (homeNr === ourTeam.pairingnumber) {
      opponentPairingNr = awayNr;
      isHome = true;
      break;
    } else if (awayNr === ourTeam.pairingnumber) {
      opponentPairingNr = homeNr;
      isHome = false;
      break;
    }
  }

  if (!opponentPairingNr) return null;

  const opponentTeam = division.teams.find((t) => t.pairingnumber === opponentPairingNr);
  const opponentClubId = opponentTeam?.idclub || 0;
  const opponentTeamName = opponentTeam?.name || `Équipe #${opponentPairingNr}`;

  // Analyze opponent's lineup in previous played rounds
  const boardOccurrences: { [board: number]: Map<number, number> } = {};
  for (let b = 1; b <= boardCount; b++) {
    boardOccurrences[b] = new Map();
  }

  allDivisionsAcrossRounds.forEach(({ divisions }) => {
    const divAtRound = divisions.find(
      (d) => d.division === division.division && (d.index || 'A') === (division.index || 'A')
    );
    if (!divAtRound) return;

    divAtRound.rounds.forEach((rd) => {
      const oppEncounter = rd.encounters.find(
        (e) =>
          e.played &&
          (e.pairingnr_home === opponentPairingNr || e.pairingnr_visit === opponentPairingNr)
      );
      if (!oppEncounter || !oppEncounter.games) return;

      const oppIsHome = oppEncounter.pairingnr_home === opponentPairingNr;
      oppEncounter.games.forEach((game, idx) => {
        const board = idx + 1;
        if (board > boardCount) return;
        const playerId = oppIsHome ? game.idnumber_home : game.idnumber_visit;
        if (playerId) {
          const map = boardOccurrences[board];
          const numId = Number(playerId);
          map.set(numId, (map.get(numId) || 0) + 1);
        }
      });
    });
  });

  let oppRatingsSum = 0;
  let oppRatingsCount = 0;
  const oppRoundAverages: number[] = [];
  const ourRoundAverages: number[] = [];
  let pastRoundsCount = 0;

  allDivisionsAcrossRounds.forEach(({ divisions }) => {
    const divAtRound = divisions.find(
      (d) => d.division === division.division && (d.index || 'A') === (division.index || 'A')
    );
    if (!divAtRound) return;

    divAtRound.rounds.forEach((rd) => {
      // Opponent encounter
      const oppEncounter = rd.encounters.find(
        (e) =>
          e.played &&
          (e.pairingnr_home === opponentPairingNr || e.pairingnr_visit === opponentPairingNr)
      );
      if (oppEncounter && oppEncounter.games && oppEncounter.games.length > 0) {
        pastRoundsCount = Math.max(pastRoundsCount, rd.round);
        const oppIsHome = oppEncounter.pairingnr_home === opponentPairingNr;
        const ratings: number[] = [];
        oppEncounter.games.slice(0, boardCount).forEach((g) => {
          const pid = Number(oppIsHome ? g.idnumber_home : g.idnumber_visit);
          const pInfo = playerDirectory?.get(pid);
          if (pInfo?.rating && pInfo.rating > 0) {
            ratings.push(pInfo.rating);
          }
        });
        if (ratings.length > 0) {
          oppRoundAverages.push(Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length));
        }
      }

      // Our encounter
      const ourEncounter = rd.encounters.find(
        (e) =>
          e.played &&
          (e.pairingnr_home === ourTeam.pairingnumber || e.pairingnr_visit === ourTeam.pairingnumber)
      );
      if (ourEncounter && ourEncounter.games && ourEncounter.games.length > 0) {
        const ourIsHome = ourEncounter.pairingnr_home === ourTeam.pairingnumber;
        const ratings: number[] = [];
        ourEncounter.games.slice(0, boardCount).forEach((g) => {
          const pid = Number(ourIsHome ? g.idnumber_home : g.idnumber_visit);
          const pInfo = playerDirectory?.get(pid);
          if (pInfo?.rating && pInfo.rating > 0) {
            ratings.push(pInfo.rating);
          }
        });
        if (ratings.length > 0) {
          ourRoundAverages.push(Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length));
        }
      }
    });
  });

  const boardsScouting: BoardScout[] = [];
  const totalRoundsPlayed = Math.max(1, nextRoundNumber - 1);

  for (let b = 1; b <= boardCount; b++) {
    const map = boardOccurrences[b];
    const seen = Array.from(map.entries())
      .map(([id, count]) => {
        const numId = Number(id);
        const info = playerDirectory?.get(numId) || playerDirectory?.get(String(id) as any);
        const rating = info?.rating || 0;
        if (rating > 0) {
          oppRatingsSum += rating;
          oppRatingsCount++;
        }
        return {
          id: numId,
          name: info?.name || `Matr. ${numId}`,
          rating,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    const ratedSeen = seen.filter((p) => p.rating > 0);
    const averageBoardElo =
      ratedSeen.length > 0
        ? Math.round(
            ratedSeen.reduce((s, p) => s + p.rating * p.count, 0) /
              ratedSeen.reduce((s, p) => s + p.count, 0)
          )
        : 0;

    const top = seen[0];
    const isRotation =
      seen.length > 1 && (!top || top.count < Math.ceil(totalRoundsPlayed / 2));

    boardsScouting.push({
      board: b,
      averageBoardElo,
      isRotation,
      frequentPlayer: top
        ? {
            name: top.name,
            id: top.id,
            rating: top.rating,
            timesPlayed: top.count,
            percentage: Math.round((top.count / totalRoundsPlayed) * 100),
          }
        : undefined,
      playersSeen: seen,
    });
  }

  // Average of team average Elo across past rounds
  const opponentAverageElo =
    oppRoundAverages.length > 0
      ? Math.round(oppRoundAverages.reduce((a, b) => a + b, 0) / oppRoundAverages.length)
      : oppRatingsCount > 0
      ? Math.round(oppRatingsSum / oppRatingsCount)
      : 1750;

  const ourAverageElo =
    ourRoundAverages.length > 0
      ? Math.round(ourRoundAverages.reduce((a, b) => a + b, 0) / ourRoundAverages.length)
      : ourTeamAverageElo && ourTeamAverageElo > 0
      ? ourTeamAverageElo
      : 1800;

  const eloDiff = ourAverageElo - opponentAverageElo;

  let readiness: ReadinessColor = 'yellow';
  let readinessReason = 'Match équilibré sur le papier (écart faible)';

  if (eloDiff >= 50) {
    readiness = 'green';
    readinessReason = `Favori (+${eloDiff} Elo)`;
  } else if (eloDiff <= -50) {
    readiness = 'red';
    readinessReason = `En danger (${eloDiff} Elo) - Besoin de renforts !`;
  }

  return {
    ourTeamName: ourTeam.name,
    divisionLabel: `Division ${division.division}${division.index}`,
    roundNumber: nextRoundNumber,
    isHome,
    opponentClubId,
    opponentTeamName,
    opponentAverageElo,
    ourAverageElo,
    eloDiff,
    readiness,
    readinessReason,
    boardsScouting,
    boardCount,
    pastRoundsCount,
  };
}
