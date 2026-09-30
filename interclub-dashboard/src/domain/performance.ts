import { PlayerFrbe, DivisionFrbe } from '../modelsFRBE';
import { getGameResult, isForfeit, GetTpr } from '../utility';

export interface PlayerStats {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  rating: number;
  titular: string;
  gamesPlayed: number;
  score: number;
  validGames: number;
  validScore: number;
  accumulatedRating: number;
  averageOpponentRating: number;
  tpr: number;
  diff: number;
  games: PlayerGameDetail[];
  divisionsPlayed: { [divisionKey: string]: number }; // e.g. "3C": 1
}

export interface PlayerGameDetail {
  round: number;
  division: string;
  board: number;
  isHome: boolean;
  color: 'white' | 'black';
  score: number;
  resultString: string;
  opponentId: number;
  opponentName?: string;
  opponentRating: number;
  opponentClub?: string;
}

/**
 * Determines score for the player based on FRBE result and Home/Away perspective
 */
export function getPlayerScoreFromFrbeResult(rawResult: string, isHomePlayer: boolean): number {
  const norm = (rawResult || '').trim();

  // Home player won
  if (norm.startsWith('1-0') || norm === '1-0 FF') {
    return isHomePlayer ? 1 : 0;
  }
  // Away player won
  if (norm.startsWith('0-1') || norm === '0-1 FF') {
    return isHomePlayer ? 0 : 1;
  }
  // Draws
  if (norm === '½-½' || norm === '1/2-1/2' || norm === '0.5-0.5') {
    return 0.5;
  }
  if (norm === '½-0') {
    return isHomePlayer ? 0.5 : 0;
  }
  if (norm === '0-½') {
    return isHomePlayer ? 0 : 0.5;
  }

  return 0;
}

/**
 * Calculates stats for all players of a club based on the played rounds
 */
export function calculateClubPlayerStats(
  clubPlayers: PlayerFrbe[],
  divisions: DivisionFrbe[],
  clubId: number,
  playerDirectory?: Map<number, { name: string; rating: number; clubName?: string }>
): PlayerStats[] {
  const statsMap = new Map<number, PlayerStats>();

  clubPlayers.forEach((p) => {
    statsMap.set(p.idnumber, {
      id: p.idnumber,
      firstName: p.first_name,
      lastName: p.last_name,
      fullName: `${p.first_name} ${p.last_name}`.trim(),
      rating: p.assignedrating || 0,
      titular: p.titular || '',
      gamesPlayed: 0,
      score: 0,
      validGames: 0,
      validScore: 0,
      accumulatedRating: 0,
      averageOpponentRating: 0,
      tpr: p.assignedrating || 0,
      diff: 0,
      games: [],
      divisionsPlayed: {},
    });
  });

  // Loop through all divisions, rounds, encounters
  divisions.forEach((div) => {
    const divKey = `${div.division}${div.index}`;

    div.rounds.forEach((round) => {
      round.encounters.forEach((encounter) => {
        if (!encounter.played || !encounter.games) return;

        const isHome = encounter.icclub_home === clubId;
        const isAway = encounter.icclub_visit === clubId;
        if (!isHome && !isAway) return;

        encounter.games.forEach((game, boardIndex) => {
          const ourPlayerId = isHome ? game.idnumber_home : game.idnumber_visit;
          const oppPlayerId = isHome ? game.idnumber_visit : game.idnumber_home;
          if (!ourPlayerId) return;

          let playerStats = statsMap.get(ourPlayerId);
          if (!playerStats) {
            // Player might not have been in initial roster
            const dirInfo = playerDirectory?.get(ourPlayerId);
            playerStats = {
              id: ourPlayerId,
              firstName: '',
              lastName: dirInfo?.name || `Matr. ${ourPlayerId}`,
              fullName: dirInfo?.name || `Matr. ${ourPlayerId}`,
              rating: dirInfo?.rating || 0,
              titular: '',
              gamesPlayed: 0,
              score: 0,
              validGames: 0,
              validScore: 0,
              accumulatedRating: 0,
              averageOpponentRating: 0,
              tpr: dirInfo?.rating || 0,
              diff: 0,
              games: [],
              divisionsPlayed: {},
            };
            statsMap.set(ourPlayerId, playerStats);
          }

          // In FRBE API, "1-0" means Home player won, "0-1" means Away player won
          const score = getPlayerScoreFromFrbeResult(game.result, isHome);

          playerStats.gamesPlayed += 1;
          playerStats.score += score;
          playerStats.divisionsPlayed[divKey] = (playerStats.divisionsPlayed[divKey] || 0) + 1;

          // Resolve opponent information
          const oppIdNum = Number(oppPlayerId);
          const oppInfo =
            playerDirectory?.get(oppIdNum) ||
            (oppPlayerId ? playerDirectory?.get(String(oppPlayerId) as any) : undefined);
          const oppRating = oppInfo?.rating && oppInfo.rating > 0 ? oppInfo.rating : 0;
          const parsedResult = getGameResult(game);

          if (!isForfeit(parsedResult) && oppRating > 0) {
            playerStats.validGames += 1;
            playerStats.validScore += score;
            playerStats.accumulatedRating += oppRating;
          }

          const boardNum = boardIndex + 1;
          const isWhite = isHome ? boardNum % 2 === 1 : boardNum % 2 === 0;
          const color: 'white' | 'black' = isWhite ? 'white' : 'black';

          playerStats.games.push({
            round: round.round,
            division: divKey,
            board: boardNum,
            isHome,
            color,
            score,
            resultString: game.result,
            opponentId: oppIdNum || 0,
            opponentName: oppInfo?.name || (oppIdNum ? `Matr. ${oppIdNum}` : 'Joueur inconnu'),
            opponentRating: oppRating,
            opponentClub: oppInfo?.clubName,
          });
        });
      });
    });
  });

  // Calculate TPR and rating differences
  const results = Array.from(statsMap.values()).map((p) => {
    if (p.validGames > 0) {
      const avgOppRating = Math.round(p.accumulatedRating / p.validGames);
      const percentage = Math.round((p.validScore / p.validGames) * 100);
      const tpr = avgOppRating + GetTpr(percentage);
      return {
        ...p,
        averageOpponentRating: avgOppRating,
        tpr,
        diff: p.rating > 0 ? tpr - p.rating : 0,
      };
    }
    return p;
  });

  // Sort by score (desc), then TPR (desc), then rating (desc)
  return results.sort((a, b) => b.score - a.score || b.tpr - a.tpr || b.rating - a.rating);
}
