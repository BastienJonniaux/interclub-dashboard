import { DivisionFrbe } from '../modelsFRBE';
import { getPlayerScoreFromFrbeResult } from './performance';

export interface BoardResultDetail {
  board: number;
  ourPlayerId: number;
  ourPlayerName: string;
  ourPlayerRating: number;
  oppPlayerId: number;
  oppPlayerName: string;
  oppPlayerRating: number;
  color: 'white' | 'black';
  resultString: string;
  score: number; // 1, 0.5, 0
  isHome: boolean;
}

export interface LatestTeamMatch {
  division: number;
  index: string;
  divisionLabel: string;
  roundNumber: number;
  ourTeamName: string;
  opponentTeamName: string;
  opponentClubId: number;
  isHome: boolean;
  ourScore: number;
  oppScore: number;
  matchOutcome: 'win' | 'draw' | 'loss';
  matchPoints: number; // 2, 1, 0
  boardCount: number;
  boards: BoardResultDetail[];
}

/**
 * Extracts latest played matches for all teams of the club with full board-by-board details
 */
export function extractLatestClubMatches(
  divisions: DivisionFrbe[],
  clubId: number,
  playerDirectory: Map<number, { name: string; rating: number; clubName?: string }>
): LatestTeamMatch[] {
  const matches: LatestTeamMatch[] = [];

  divisions.forEach((div) => {
    // Find our team in this division
    const ourTeam = div.teams.find((t) => t.idclub === clubId);
    if (!ourTeam) return;

    // Find the latest played round for our team
    let latestPlayedRound = 0;
    let latestEncounter: any = null;

    div.rounds.forEach((rd) => {
      const enc = rd.encounters.find(
        (e) =>
          e.played &&
          (e.pairingnr_home === ourTeam.pairingnumber || e.pairingnr_visit === ourTeam.pairingnumber)
      );
      if (enc && rd.round > latestPlayedRound) {
        latestPlayedRound = rd.round;
        latestEncounter = enc;
      }
    });

    if (!latestEncounter || !latestPlayedRound) return;

    const isHome = latestEncounter.pairingnr_home === ourTeam.pairingnumber;
    const oppPairingNr = isHome ? latestEncounter.pairingnr_visit : latestEncounter.pairingnr_home;
    const oppTeam = div.teams.find((t) => t.pairingnumber === oppPairingNr);
    const opponentTeamName = oppTeam?.name || `Équipe #${oppPairingNr}`;
    const opponentClubId = isHome ? latestEncounter.icclub_visit : latestEncounter.icclub_home;

    const ourScore = isHome
      ? (latestEncounter.boardpoint2_home || 0) / 2
      : (latestEncounter.boardpoint2_visit || 0) / 2;
    const oppScore = isHome
      ? (latestEncounter.boardpoint2_visit || 0) / 2
      : (latestEncounter.boardpoint2_home || 0) / 2;

    const matchOutcome: 'win' | 'draw' | 'loss' =
      ourScore > oppScore ? 'win' : ourScore === oppScore ? 'draw' : 'loss';

    const matchPoints = isHome
      ? latestEncounter.matchpoint_home ?? (matchOutcome === 'win' ? 2 : matchOutcome === 'draw' ? 1 : 0)
      : latestEncounter.matchpoint_visit ?? (matchOutcome === 'win' ? 2 : matchOutcome === 'draw' ? 1 : 0);

    const games = latestEncounter.games || [];
    const boards: BoardResultDetail[] = games.map((game: any, idx: number) => {
      const board = idx + 1;
      const ourPlayerId = Number(isHome ? game.idnumber_home : game.idnumber_visit) || 0;
      const oppPlayerId = Number(isHome ? game.idnumber_visit : game.idnumber_home) || 0;

      const ourInfo = playerDirectory.get(ourPlayerId);
      const oppInfo = playerDirectory.get(oppPlayerId);

      const isWhite = isHome ? board % 2 === 1 : board % 2 === 0;
      const score = getPlayerScoreFromFrbeResult(game.result, isHome);

      return {
        board,
        ourPlayerId,
        ourPlayerName: ourInfo?.name || (ourPlayerId ? `Matr. ${ourPlayerId}` : 'Inconnu'),
        ourPlayerRating: ourInfo?.rating || 0,
        oppPlayerId,
        oppPlayerName: oppInfo?.name || (oppPlayerId ? `Matr. ${oppPlayerId}` : 'Inconnu'),
        oppPlayerRating: oppInfo?.rating || 0,
        color: isWhite ? 'white' : 'black',
        resultString: game.result,
        score,
        isHome,
      };
    });

    matches.push({
      division: div.division,
      index: div.index || 'A',
      divisionLabel: `Division ${div.division}${div.index || 'A'}`,
      roundNumber: latestPlayedRound,
      ourTeamName: ourTeam.name,
      opponentTeamName,
      opponentClubId,
      isHome,
      ourScore,
      oppScore,
      matchOutcome,
      matchPoints,
      boardCount: boards.length,
      boards,
    });
  });

  return matches.sort((a, b) => a.division - b.division || a.index.localeCompare(b.index));
}
